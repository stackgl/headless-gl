'use strict'

const tape = require('tape')
const createContext = require('../index')
const makeProgram = require('./util/make-program')

for (const webgl2 of [false, true]) {
  tape(`draw elements: WebGL${webgl2 ? 2 : 1} negative offsets set INVALID_VALUE`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })
    gl.useProgram(makeProgram(gl, 'attribute vec4 position;\nvoid main() {\n  gl_Position = position;\n}', 'void main() {\n  gl_FragColor = vec4(1.0);\n}'))
    // Instanced draws need an attribute without a divisor.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(12), gl.STATIC_DRAW)
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array([0, 1, 2]), gl.STATIC_DRAW)

    const ext = webgl2 ? null : gl.getExtension('ANGLE_instanced_arrays')
    const draws = webgl2
      ? {
          drawElements: (count, offset) => gl.drawElements(gl.POINTS, count, gl.UNSIGNED_BYTE, offset),
          drawElementsInstanced: (count, offset) => gl.drawElementsInstanced(gl.POINTS, count, gl.UNSIGNED_BYTE, offset, 1),
          drawRangeElements: (count, offset) => gl.drawRangeElements(gl.POINTS, 0, 2, count, gl.UNSIGNED_BYTE, offset)
        }
      : {
          drawElements: (count, offset) => gl.drawElements(gl.POINTS, count, gl.UNSIGNED_BYTE, offset),
          drawElementsInstancedANGLE: (count, offset) => ext.drawElementsInstancedANGLE(gl.POINTS, count, gl.UNSIGNED_BYTE, offset, 1)
        }
    for (const [name, draw] of Object.entries(draws)) {
      draw(2, 1)
      t.equal(gl.getError(), gl.NO_ERROR, `${name} draws from an offset into the element array buffer`)
      draw(1, -1)
      t.equal(gl.getError(), gl.INVALID_VALUE, 'and sets INVALID_VALUE for a negative one')
      draw(0, -1)
      t.equal(gl.getError(), gl.INVALID_VALUE, 'even when it draws nothing')
    }

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}
