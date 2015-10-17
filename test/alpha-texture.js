'use strict'

var tape          = require('tape')
var createContext = require('../index')
var drawTriangle  = require('./util/draw-triangle')
var makeShader    = require('./util/make-program')

tape('alpha texture', function(t) {
  var width   = 64
  var height  = 64
  var gl = createContext(width, height)

  var vertex_src = [
    'precision mediump float;',
    'attribute vec2 position;',
    'varying vec2 texCoord;',
    'void main() {',
      'texCoord = 0.5*(position - 1.0);',
      'gl_Position = vec4(position,0,1);',
    '}'
  ].join('\n')

  var fragment_src = [
    'precision mediump float;',
    'uniform sampler2D tex;',
    'varying vec2 texCoord;',
    'void main() {',
      'gl_FragColor = texture2D(tex, texCoord);',
    '}'
  ].join('\n')

  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)


  var data = new Uint8Array(width*height)
  for(var i=0; i<height; ++i) {
    for(var j=0; j<width; ++j) {
      data[width*i+j] = (i+j) % 255
    }
  }

  var texture = gl.createTexture()
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

  var program = makeShader(gl, vertex_src, fragment_src)

  gl.useProgram(program)
  gl.uniform1i(gl.getUniformLocation(program, 'tex'), 0)
  drawTriangle(gl)

  t.equals(gl.getError(), gl.NO_ERROR)

  var pixels = new Uint8Array(width * height * 4)
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
  var ptr = 0
  for(var i=0; i<width*height*4; i+=4) {
    t.equals(pixels[i],   0, 'red')
    t.equals(pixels[i+1], 0, 'green')
    t.equals(pixels[i+2], 0, 'blue')
    t.equals(pixels[i+3], data[ptr++], 'alpha')
  }

  t.end()
})
