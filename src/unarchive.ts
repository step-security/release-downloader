import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import * as tar from 'tar'
import * as StreamZip from 'node-stream-zip'

export const extract = async (
  filePath: string,
  destDir: string
): Promise<void> => {
  const isTarGz = filePath.endsWith('.tar.gz') || filePath.endsWith('.tar')
  const isZip = filePath.endsWith('.zip')
  const filename = path.basename(filePath)

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
      }
    })
  }
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
}
