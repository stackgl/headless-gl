'use strict'

var tape = require('tape')
var createContext = require('../index')
var drawTriangle = require('./util/draw-triangle')
var makeShader = require('./util/make-program')

tape('depth-buffer', function (t) {
  var width = 50
  var height = 50
  var gl = createContext(width, height)

  var vertex_src = [
    'attribute vec2 position;',
    'uniform float depth;',
    'void main() { gl_Position = vec4(position,depth,1); }'
  ].join('\n')

  var fragment_src = [
    'precision mediump float;',
    'uniform vec4 color;',
    'void main() { gl_FragColor = color; }'
  ].join('\n')

  gl.clearColor(0, 0, 0, 0)
  gl.clearDepth(1)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  gl.enable(gl.DEPTH_TEST)
  gl.depthFunc(gl.NOTEQUAL)

  var program = makeShader(gl, vertex_src, fragment_src)
  gl.useProgram(program)
  gl.uniform1f(gl.getUniformLocation(program, 'depth'), 0)
  gl.uniform4f(gl.getUniformLocation(program, 'color'), 1, 0, 0, 1)
  drawTriangle(gl)
  gl.uniform1f(gl.getUniformLocation(program, 'depth'), 1)
  gl.uniform4f(gl.getUniformLocation(program, 'color'), 0, 1, 0, 1)
  drawTriangle(gl)

  var pixels = new Uint8Array(width * height * 4)
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
  function checkPixels () {
    for (var i = 0; i < width * height * 4; i += 4) {
      if (pixels[i] !== 0 ||
          pixels[i + 1] !== 255 ||
          pixels[i + 2] !== 0 ||
          pixels[i + 3] !== 255) {
        return false
      }
    }
    return true
  }
  t.ok(checkPixels, 'pixels consistent')

  t.end()
})
