'use strict'

const tape = require('tape')
const createContext = require('../index')

for (const webgl2 of [false, true]) {
  tape(`readPixels: WebGL${webgl2 ? 2 : 1} into an array`, function (t) {
    const gl = createContext(2, 1, { createWebGL2Context: webgl2 })
    gl.clearColor(1, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    const pixels = new Uint8Array(8)
    gl.readPixels(0, 0, 2, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    t.equal(gl.getError(), gl.NO_ERROR, 'readPixels sets no error')
    t.deepEqual([...pixels], [255, 0, 0, 255, 255, 0, 0, 255], 'and reads the pixels')

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })

  tape(`readPixels: WebGL${webgl2 ? 2 : 1} with no pixels to read or nowhere to put them`, function (t) {
    const gl = createContext(2, 1, { createWebGL2Context: webgl2 })

    gl.readPixels(0, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(0))
    t.equal(gl.getError(), gl.NO_ERROR, 'reading no pixels into an empty array sets no error')

    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, null)
    t.equal(gl.getError(), gl.INVALID_VALUE, 'null pixels set INVALID_VALUE')

    if (webgl2) {
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, 0)
      t.equal(gl.getError(), gl.INVALID_OPERATION, 'an offset without a pixel pack buffer sets INVALID_OPERATION')
    } else {
      t.throws(() => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, 0), TypeError, 'a number instead of an array throws a TypeError')
    }

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}
