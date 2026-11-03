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

  tape(`readPixels: WebGL${webgl2 ? 2 : 1} arrays too small for the pixels`, function (t) {
    const gl = createContext(2, 1, { createWebGL2Context: webgl2 })
    gl.clearColor(1, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    // A view of the first 4 bytes of a larger buffer, so bytes written past the view's end can be seen.
    const backing = new Uint8Array(16)
    gl.readPixels(0, 0, 2, 1, gl.RGBA, gl.UNSIGNED_BYTE, backing.subarray(0, 4))
    t.equal(gl.getError(), gl.INVALID_OPERATION, 'readPixels sets INVALID_OPERATION')
    t.deepEqual([...backing], new Array(16).fill(0), 'and writes nothing')

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

tape('readPixels: WebGL2 into a pixel pack buffer', function (t) {
  const gl = createContext(2, 1, { createWebGL2Context: true })
  gl.clearColor(1, 0, 0, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)

  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, gl.createBuffer())
  gl.bufferData(gl.PIXEL_PACK_BUFFER, 12, gl.STREAM_READ)
  gl.readPixels(0, 0, 2, 1, gl.RGBA, gl.UNSIGNED_BYTE, 4)
  t.equal(gl.getError(), gl.NO_ERROR, 'readPixels at an offset sets no error')
  const pixels = new Uint8Array(12)
  gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, pixels)
  t.deepEqual([...pixels], [0, 0, 0, 0, 255, 0, 0, 255, 255, 0, 0, 255], 'and writes the pixels from that offset')

  gl.readPixels(0, 0, 2, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(8))
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'an array while a pixel pack buffer is bound sets INVALID_OPERATION')
  gl.readPixels(0, 0, 2, 1, gl.RGBA, gl.UNSIGNED_BYTE, -1)
  t.equal(gl.getError(), gl.INVALID_VALUE, 'a negative offset sets INVALID_VALUE')
  gl.readPixels(0, 0, 2, 1, gl.RGBA, gl.UNSIGNED_BYTE, 8)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'pixels past the end of the buffer set INVALID_OPERATION')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
