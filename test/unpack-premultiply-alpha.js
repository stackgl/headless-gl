'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawPixel = require('./util/draw-pixel')

const HALF_FLOAT_OES = 0x8D61

// 1, 0.5, 0 and 0.4 as half floats.
const HALF_COLOR = [0x3C00, 0x3800, 0, 0x3666]

// Uploads a 1 by 1 texture with UNPACK_PREMULTIPLY_ALPHA_WEBGL and draws its color.
function premultiplied (gl, internalFormat, format, type, data) {
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 1, 1, 0, format, type, data)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
  return drawPixel(gl, `precision mediump float;
uniform sampler2D sampler;
void main() {
  gl_FragColor = texture2D(sampler, vec2(0.5));
}`)
}

tape('UNPACK_PREMULTIPLY_ALPHA_WEBGL: WebGL1 float and half-float textures', function (t) {
  const gl = createContext(1, 1)
  gl.getExtension('OES_texture_float')
  gl.getExtension('OES_texture_half_float')

  t.deepEqual(premultiplied(gl, gl.RGBA, gl.RGBA, gl.FLOAT, new Float32Array([1, 0.5, 0, 0.4])), [102, 51, 0, 102], 'RGBA FLOAT')
  t.deepEqual(premultiplied(gl, gl.LUMINANCE_ALPHA, gl.LUMINANCE_ALPHA, gl.FLOAT, new Float32Array([0.5, 0.4])), [51, 51, 51, 102], 'LUMINANCE_ALPHA FLOAT')
  t.deepEqual(premultiplied(gl, gl.RGBA, gl.RGBA, HALF_FLOAT_OES, new Uint16Array(HALF_COLOR)), [102, 51, 0, 102], 'RGBA HALF_FLOAT_OES')
  t.deepEqual(premultiplied(gl, gl.LUMINANCE_ALPHA, gl.LUMINANCE_ALPHA, HALF_FLOAT_OES, new Uint16Array([0x3800, 0x3666])), [51, 51, 51, 102], 'LUMINANCE_ALPHA HALF_FLOAT_OES')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('UNPACK_PREMULTIPLY_ALPHA_WEBGL: WebGL1 packed types', function (t) {
  const gl = createContext(1, 1)

  // White with alpha 8 of 15.
  t.deepEqual(premultiplied(gl, gl.RGBA, gl.RGBA, gl.UNSIGNED_SHORT_4_4_4_4, new Uint16Array([0xFFF8])), [136, 136, 136, 136], 'UNSIGNED_SHORT_4_4_4_4')
  t.deepEqual(premultiplied(gl, gl.RGBA, gl.RGBA, gl.UNSIGNED_SHORT_5_5_5_1, new Uint16Array([0xFFFE])), [0, 0, 0, 0], 'UNSIGNED_SHORT_5_5_5_1 with alpha 0 is cleared')
  t.deepEqual(premultiplied(gl, gl.RGBA, gl.RGBA, gl.UNSIGNED_SHORT_5_5_5_1, new Uint16Array([0xFFFF])), [255, 255, 255, 255], 'UNSIGNED_SHORT_5_5_5_1 with alpha 1 is kept')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('UNPACK_PREMULTIPLY_ALPHA_WEBGL: WebGL2 types', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  t.deepEqual(premultiplied(gl, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, new Uint16Array(HALF_COLOR)), [102, 51, 0, 102], 'RGBA16F HALF_FLOAT')
  t.deepEqual(premultiplied(gl, gl.RGBA32F, gl.RGBA, gl.FLOAT, new Float32Array([1, 0.5, 0, 0.4])), [102, 51, 0, 102], 'RGBA32F FLOAT')
  // Magenta with alpha 1 of 3.
  t.deepEqual(premultiplied(gl, gl.RGB10_A2, gl.RGBA, gl.UNSIGNED_INT_2_10_10_10_REV, new Uint32Array([0x7FF003FF])), [85, 0, 85, 85], 'RGB10_A2 UNSIGNED_INT_2_10_10_10_REV')

  // Integer formats have no alpha to premultiply by.
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8UI, 1, 1, 0, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, new Uint8Array([10, 20, 30, 127]))
  t.deepEqual(drawPixel(gl, `#version 300 es
precision highp float;
precision highp usampler2D;
uniform usampler2D sampler;
out vec4 color;
void main() {
  color = vec4(texture(sampler, vec2(0.5))) / 255.0;
}`), [10, 20, 30, 127], 'RGBA8UI is left as it is')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
