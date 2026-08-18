import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const licensesRoot = path.resolve('public/licenses')
const fontPackages = [
  { directory: '@fontsource/noto-serif-tc', licenseFile: 'Noto-Serif-TC-OFL-1.1.txt', name: 'Noto Serif TC' },
  { directory: '@fontsource/noto-sans-tc', licenseFile: 'Noto-Sans-TC-OFL-1.1.txt', name: 'Noto Sans TC' },
  { directory: '@fontsource-variable/manrope', licenseFile: 'Manrope-OFL-1.1.txt', name: 'Manrope' },
]

async function writeIfChanged(filePath, contents) {
  try {
    if ((await readFile(filePath, 'utf8')) === contents) return false
  } catch {
    // The first run creates the deployed notice artifact.
  }
  await writeFile(filePath, contents)
  return true
}

await mkdir(licensesRoot, { recursive: true })
const notices = ['Third-Party Font Notices', '', 'This site includes locally generated subsets from the pinned Fontsource packages below. The full license text copied from each package is included alongside this notice.', '']
let changed = 0

for (const font of fontPackages) {
  const packageRoot = path.join('node_modules', font.directory)
  const metadata = JSON.parse(await readFile(path.join(packageRoot, 'metadata.json'), 'utf8'))
  const license = await readFile(path.join(packageRoot, 'LICENSE'), 'utf8')
  if (await writeIfChanged(path.join(licensesRoot, font.licenseFile), license)) changed += 1

  notices.push(font.name, `Package: ${font.directory}`, `Copyright notice: ${metadata.license.attribution}`, `License: ${metadata.license.type} (${metadata.license.url})`, `License text: ${font.licenseFile}`, '')
}

if (await writeIfChanged(path.join(licensesRoot, 'THIRD-PARTY-FONTS.txt'), notices.join('\n'))) changed += 1
console.log(`Synchronized ${fontPackages.length} font license texts (${changed} files changed).`)
