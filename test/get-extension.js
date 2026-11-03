'use strict'

const childProcess = require('child_process')
const path = require('path')
const tape = require('tape')

tape('getExtension: unsupported extensions return null without printing anything', function (t) {
  // The native side prints with printf, which a test in this process can't capture, so run the calls in a child process.
  const script = `
    const createContext = require(${JSON.stringify(path.join(__dirname, '..', 'index'))})
    const gl = createContext(1, 1)
    const gl2 = createContext(1, 1, { createWebGL2Context: true })
    console.error(JSON.stringify([
      gl.getExtension('EXT_color_buffer_float'),
      gl2.getExtension('OES_texture_float'),
      gl2.getExtension('WEBGL_color_buffer_float')
    ]))
  `
  const result = childProcess.spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' })
  t.equal(result.status, 0, 'the child process exits normally')
  t.equal(result.stderr.trim(), '[null,null,null]', 'each extension of the other WebGL version is null')
  t.equal(result.stdout, '', 'nothing is printed')
  t.end()
})

tape('getExtension: supported extensions are enabled without printing anything', function (t) {
  const script = `
    const createContext = require(${JSON.stringify(path.join(__dirname, '..', 'index'))})
    for (const webgl2 of [false, true]) {
      const gl = createContext(1, 1, { createWebGL2Context: webgl2 })
      for (const name of gl.getSupportedExtensions()) {
        if (!gl.getExtension(name)) {
          console.error(name + ' is null')
        }
      }
    }
  `
  const result = childProcess.spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' })
  t.equal(result.status, 0, 'the child process exits normally')
  t.equal(result.stderr, '', 'every supported extension returns an object')
  t.equal(result.stdout, '', 'nothing is printed')
  t.end()
})
