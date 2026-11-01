// Prepares the ANGLE libraries in deps/ for the GitHub release that source builds download them from, since the npm package leaves deps/ out.
// Usage: node scripts/angle-assets.js <release tag> <output folder>
// It writes each library gzipped as <folder>-<file>.gz to the output folder, and records the tag and each library's SHA-256 hash in src/angle.json.
// Use a new tag whenever the libraries change, and commit src/angle.json. The ANGLE release workflow then creates that release on master and uploads the .gz files to it.
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const [release, output] = process.argv.slice(2)
if (!release || !output) {
  console.error('Usage: node scripts/angle-assets.js <release tag> <output folder>')
  process.exit(1)
}

const deps = path.join(__dirname, '..', 'deps')
const libraries = {}
fs.mkdirSync(output, { recursive: true })
for (const platform of fs.readdirSync(deps).sort()) {
  for (const kind of fs.readdirSync(path.join(deps, platform)).sort()) {
    const folder = `${platform}/${kind}`
    libraries[folder] = {}
    for (const name of fs.readdirSync(path.join(deps, folder)).sort()) {
      const data = fs.readFileSync(path.join(deps, folder, name))
      libraries[folder][name] = crypto.createHash('sha256').update(data).digest('hex')
      fs.writeFileSync(path.join(output, `${platform}-${name}.gz`), zlib.gzipSync(data, { level: 9 }))
    }
  }
}

fs.writeFileSync(path.join(__dirname, '..', 'src', 'angle.json'), JSON.stringify({ release, libraries }, null, 2) + '\n')
