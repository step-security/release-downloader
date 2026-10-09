import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import * as tar from 'tar'
import StreamZip from 'node-stream-zip'

import { FileNotFoundError, ReleaseDownloaderError } from './errors.js'

export const extract = async (
  filePath: string,
  destDir: string
): Promise<void> => {
  const filename = path.basename(filePath)

  // Check file exists BEFORE attempting extraction
  if (!fs.existsSync(filePath)) {
    throw new FileNotFoundError(
      filePath,
      'Extract archive',
      'The download may have failed silently, or the file path is incorrect. ' +
        'Check the download logs above for any errors.'
    )
  }

  const isTarGz = filePath.endsWith('.tar.gz') || filePath.endsWith('.tar')
  const isZip = filePath.endsWith('.zip')

  if (!isTarGz && !isZip) {
    core.warning(
      `The file ${filename} is not a supported archive. It will be skipped`
    )
    return
  }

  // Create the destination directory if it doesn't already exist
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }

  const resolvedDest = path.resolve(destDir)
  const isInsideDest = (resolved: string): boolean =>
    resolved === resolvedDest || resolved.startsWith(resolvedDest + path.sep)

  try {
    // Extract the file to the destination directory
    if (isTarGz) {
      await tar.x({
        file: filePath,
        cwd: destDir,
        filter: (entryPath: string) => {
          if (!isInsideDest(path.resolve(destDir, entryPath))) {
            core.warning(`Skipping tar entry with path traversal: ${entryPath}`)
            return false
          }
          return true
        }
      })
    }
    if (isZip) {
      const zip = new StreamZip.async({ file: filePath })
      try {
        const entries = await zip.entries()
        for (const entry of Object.values(entries)) {
          const resolved = path.resolve(destDir, entry.name)
          if (!isInsideDest(resolved)) {
            core.warning(
              `Skipping zip entry with path traversal: ${entry.name}`
            )
            continue
          }
          if (entry.isDirectory) {
            fs.mkdirSync(resolved, { recursive: true })
          } else {
            fs.mkdirSync(path.dirname(resolved), { recursive: true })
            await zip.extract(entry.name, resolved)
          }
        }
      } finally {
        await zip.close()
      }
    }

    fs.rm(filePath, err => {
      if (err) {
        core.warning(
          `Failed to delete archive ${filename} after extraction: ${err.message}`
        )
      }
    })
    core.info(`Extracted ${filename} to ${destDir}`)
  } catch (err) {
    // Provide context for extraction failures
    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.includes('ENOENT')) {
      throw new FileNotFoundError(
        filePath,
        'Extract archive',
        'File disappeared during extraction. Check for disk space or permission issues.'
      )
    }
    throw new ReleaseDownloaderError(
      `Failed to extract '${filename}': ${errMsg}`,
      { filePath, destDir }
    )
  }
}
