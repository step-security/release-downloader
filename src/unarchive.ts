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

<<<<<<< 3eaf78dcfc719d1551a4d535699e01b568536167
  const resolvedDest = path.resolve(destDir)

  // Extract the file to the destination directory
  if (isTarGz) {
    await tar.x({
      file: filePath,
      cwd: destDir,
      filter: (entryPath: string) => {
        const resolved = path.resolve(destDir, entryPath)
        if (
          !resolved.startsWith(resolvedDest + path.sep) &&
          resolved !== resolvedDest
        ) {
          core.warning(`Skipping tar entry with path traversal: ${entryPath}`)
          return false
        }
        return true
=======
  try {
    // Extract the file to the destination directory
    if (isTarGz) {
      await tar.x({
        file: filePath,
        cwd: destDir
      })
    }
    if (isZip) {
      const zip = new StreamZip.async({ file: filePath })
      await zip.extract(null, destDir)
      await zip.close()
    }

    fs.rm(filePath, err => {
      if (err) {
        core.warning(
          `Failed to delete archive ${filename} after extraction: ${err.message}`
        )
>>>>>>> 90b204cfe813300d5d7c9898ea1064f029f7699b
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
<<<<<<< 3eaf78dcfc719d1551a4d535699e01b568536167
  if (isZip) {
    const zip = new StreamZip.async({ file: filePath })
    const entries = await zip.entries()
    for (const entry of Object.values(entries)) {
      const resolved = path.resolve(destDir, entry.name)
      if (
        !resolved.startsWith(resolvedDest + path.sep) &&
        resolved !== resolvedDest
      ) {
        core.warning(`Skipping zip entry with path traversal: ${entry.name}`)
        continue
      }
      if (entry.isDirectory) {
        fs.mkdirSync(resolved, { recursive: true })
      } else {
        const dir = path.dirname(resolved)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        await zip.extract(entry.name, resolved)
      }
    }
    await zip.close()
  }
  core.info(`Extracted ${filename} to ${destDir}`)
=======
>>>>>>> 90b204cfe813300d5d7c9898ea1064f029f7699b
}
