'use strict'

const tape = require('tape')
const createContext = require('../index')

for (const webgl2 of [false, true]) {
  tape(`buffer targets: WebGL${webgl2 ? 2 : 1} bufferData and bufferSubData with a bad target or no buffer bound`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })

    gl.bufferData(gl.TEXTURE_2D, 4, gl.STATIC_DRAW)
    t.equal(gl.getError(), gl.INVALID_ENUM, 'bufferData with a bad target sets INVALID_ENUM')
    gl.bufferSubData(gl.TEXTURE_2D, 0, new Uint8Array(4))
    t.equal(gl.getError(), gl.INVALID_ENUM, 'bufferSubData with a bad target sets INVALID_ENUM')

    gl.bufferData(gl.ARRAY_BUFFER, 4, gl.STATIC_DRAW)
    t.equal(gl.getError(), gl.INVALID_OPERATION, 'bufferData with no buffer bound sets INVALID_OPERATION')
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Uint8Array(4))
    t.equal(gl.getError(), gl.INVALID_OPERATION, 'bufferSubData with no buffer bound sets INVALID_OPERATION')

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}
