'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawPixel = require('./util/draw-pixel')

const HALF_FLOAT_OES = 0x8D61

// Half-float bit patterns.
const ZERO = 0x0000
const ONE = 0x3C00

// Draws the bound texture's color divided by 4 at the given t coordinate, so values above 1 show up.
function sample (gl, t) {
  return drawPixel(gl, `precision mediump float;
uniform sampler2D sampler;
uniform float t;
void main() {
  vec4 color = texture2D(sampler, vec2(0.5, t));
  gl_FragColor = vec4(color.rgb / 4.0, color.a);
}`, program => gl.uniform1f(gl.getUniformLocation(program, 't'), t))
}

function createTexture (gl) {
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
}

tape('OES_texture_half_float: availability', function (t) {
  const gl = createContext(1, 1)
  const ext = gl.getExtension('OES_texture_half_float')
  t.ok(ext, 'available on WebGL1')
  t.equal(ext.HALF_FLOAT_OES, HALF_FLOAT_OES, 'HALF_FLOAT_OES')
  gl.getExtension('STACKGL_destroy_context').destroy()

  const gl2 = createContext(1, 1, { createWebGL2Context: true })
  t.equal(gl2.getExtension('OES_texture_half_float'), null, 'not available on WebGL2, which has half-float textures built in')
  gl2.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('OES_texture_half_float: textures', function (t) {
  const gl = createContext(1, 1)
  createTexture(gl)

  // 4, 2.4, 0.8 and 1, which the shader turns into 1, 0.6, 0.2 and 1.
  const pixel = new Uint16Array([0x4400, 0x40CD, 0x3A66, ONE])
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, HALF_FLOAT_OES, pixel)
  t.equal(gl.getError(), gl.INVALID_ENUM, 'texImage2D sets INVALID_ENUM before it is enabled')

  gl.getExtension('OES_texture_half_float')
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, HALF_FLOAT_OES, pixel)
  t.deepEqual(sample(gl, 0.5), [255, 153, 51, 255], 'texImage2D uploads half floats from a Uint16Array')
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 1, gl.RGBA, HALF_FLOAT_OES, new Uint16Array([ZERO, 0x4400, ZERO, ONE]))
  t.deepEqual(sample(gl, 0.5), [0, 255, 0, 255], 'texSubImage2D too')
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, HALF_FLOAT_OES, null)
  t.deepEqual(sample(gl, 0.5), [0, 0, 0, 0], 'texImage2D without data')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('OES_texture_half_float: uploads with UNPACK_FLIP_Y_WEBGL', function (t) {
  const gl = createContext(1, 1)
  gl.getExtension('OES_texture_half_float')
  createTexture(gl)

  // The first row is 4 and the second 0, so flipping puts the row of 0 at t = 0.25.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 2, 0, gl.RGBA, HALF_FLOAT_OES, new Uint16Array([0x4400, 0x4400, 0x4400, ONE, ZERO, ZERO, ZERO, ONE]))
  t.equal(gl.getError(), gl.NO_ERROR, 'texImage2D has no GL error')
  t.deepEqual(sample(gl, 0.25), [0, 0, 0, 255], 'the rows are flipped')
  t.deepEqual(sample(gl, 0.75), [255, 255, 255, 255], 'and the row of 4 at t = 0.75')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
