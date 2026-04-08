'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawTriangle = require('./util/draw-triangle')
const makeShader = require('./util/make-program')

tape('alpha texture', function (t) {
  const width = 64
  const height = 64
  const gl = createContext(width, height)

  const vertexSrc = [
    'precision mediump float;',
    'attribute vec2 position;',
    'varying vec2 texCoord;',
    'void main() {',
    'texCoord = 0.5*(position + 1.0);',
    'gl_Position = vec4(position,0,1);',
    '}'
  ].join('\n')

  const fragmentSrc = [
    'precision mediump float;',
    'uniform sampler2D tex;',
    'varying vec2 texCoord;',
    'void main() {',
    'gl_FragColor = texture2D(tex, texCoord);',
    '}'
  ].join('\n')

  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  const data = new Uint8Array(width * height)
  for (let i = 0; i < height; ++i) {
    for (let j = 0; j < width; ++j) {
      data[width * i + j] = (i + j) % 255
    }
  }

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.ALPHA,
    width, height,
    0,
    gl.ALPHA,
    gl.UNSIGNED_BYTE,
    data)

  const program = makeShader(gl, vertexSrc, fragmentSrc)

  gl.useProgram(program)
  gl.uniform1i(gl.getUniformLocation(program, 'tex'), 0)
  drawTriangle(gl)

  t.equals(gl.getError(), gl.NO_ERROR)

  const pixels = new Uint8Array(width * height * 4)
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

  function checkColor () {
    let ptr = 0
    for (let i = 0; i < width * height * 4; i += 4) {
      if (pixels[i] ||
          pixels[i + 1] ||
          pixels[i + 2] ||
          pixels[i + 3] !== data[ptr++]) {
        return false
      }
    }
    return true
  }

  t.ok(checkColor(), 'pixels consistent')

  t.end()
})
