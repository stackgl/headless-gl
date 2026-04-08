'use strict'

const tape = require('tape')
const createContext = require('../index')
const makeShader = require('./util/make-program')

tape('draw-indexed', function (t) {
  const width = 50
  const height = 50
  const gl = createContext(width, height)

  const vertexSrc = [
    'attribute vec2 position;',
    'void main() { gl_Position = vec4(position,0,1); }'
  ].join('\n')

  const fragmentSrc = [
    'void main() { gl_FragColor = vec4(0,1,0,1); }'
  ].join('\n')

  gl.clearColor(1, 0, 0, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)

  const program = makeShader(gl, vertexSrc, fragmentSrc)
  gl.useProgram(program)

  const vbuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vbuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const ebuffer = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebuffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([
    0, 1, 2,
    2, 1, 3
  ]), gl.STATIC_DRAW)

  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)

  const pixels = new Uint8Array(width * height * 4)
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

  function checkPixels () {
    for (let i = 0; i < width * height * 4; i += 4) {
      if (pixels[i] !== 0 ||
          pixels[i + 1] !== 255 ||
          pixels[i + 2] !== 0 ||
          pixels[i + 3] !== 255) {
        return false
      }
    }
    return true
  }
  t.ok(checkPixels())

  t.end()
})
