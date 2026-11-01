// binding.gyp runs this to find the folder in deps/ with the ANGLE libraries for the target, and it prints that folder.
// The npm package leaves deps/ out, so when the libraries are missing, it downloads them from a GitHub release and checks their SHA-256 hashes from angle.json.
// HEADLESS_GL_ANGLE_MIRROR can name a URL or a local folder to get the .gz files from instead.
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { release, libraries } = require('./angle.json')

function getFolder (os, arch, libc) {
  if (os === 'mac') {
    return 'darwin/dylib'
  }
  if (os === 'win') {
    return 'windows/dll'
  }
  if (os === 'linux' && (arch === 'x64' || arch === 'arm64')) {
    return `linux${libc === 'musl' ? 'musl' : ''}${arch === 'arm64' ? '-arm64' : ''}/so`
  }
  return null
}

async function download (folder, name, hash, file) {
  const asset = `${folder.split('/')[0]}-${name}.gz`
  const mirror = process.env.HEADLESS_GL_ANGLE_MIRROR
  const source = mirror || `https://github.com/stackgl/headless-gl/releases/download/${release}`
  let compressed
  if (/^https?:\/\//.test(source)) {
    const response = await fetch(`${source}/${asset}`)
    if (!response.ok) {
      throw new Error(`Error downloading ${source}/${asset}: HTTP status ${response.status}.`)
    }
    compressed = Buffer.from(await response.arrayBuffer())
  } else {
    compressed = fs.readFileSync(path.join(source, asset))
  }

  const data = zlib.gunzipSync(compressed)
  const actual = crypto.createHash('sha256').update(data).digest('hex')
  if (actual !== hash) {
    throw new Error(`Error downloading ${asset}: its SHA-256 hash is ${actual}, expected ${hash}.`)
  }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(`${file}.download`, data)
  fs.renameSync(`${file}.download`, file)
}

async function main () {
  const folder = getFolder(...process.argv.slice(2))
  if (!folder) {
    return
  }
  for (const [name, hash] of Object.entries(libraries[folder])) {
    const file = path.join(__dirname, '..', 'deps', folder, name)
    if (!fs.existsSync(file)) {
      await download(folder, name, hash, file)
    }
  }
  console.log(`deps/${folder}`)
}

main().catch(function (error) {
  console.error(error.message)
  process.exitCode = 1
})
