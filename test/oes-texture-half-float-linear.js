'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawPixel = require('./util/draw-pixel')

// Draws the bound texture's color halfway between its two texels.
function sampleBetweenTexels (gl) {
  return drawPixel(gl, `precision mediump float;
uniform sampler2D sampler;
void main() {
  gl_FragColor = texture2D(sampler, vec2(0.5, 0.5));
}`)
}

tape('OES_texture_half_float_linear: availability', function (t) {
  const gl = createContext(1, 1)
  t.ok(gl.getExtension('OES_texture_half_float_linear'), 'available on WebGL1')
  gl.getExtension('STACKGL_destroy_context').destroy()

  const gl2 = createContext(1, 1, { createWebGL2Context: true })
  t.equal(gl2.getExtension('OES_texture_half_float_linear'), null, 'not available on WebGL2, which filters half-float textures linearly without it')
  gl2.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('OES_texture_half_float_linear: linear filtering', function (t) {
  const gl = createContext(1, 1)
  const { HALF_FLOAT_OES } = gl.getExtension('OES_texture_half_float')

  // A black texel and one of 0.8, which average to 0.4.
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 1, 0, gl.RGBA, HALF_FLOAT_OES, new Uint16Array([0, 0, 0, 0x3C00, 0x3A66, 0x3A66, 0x3A66, 0x3C00]))
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

  t.deepEqual(sampleBetweenTexels(gl), [0, 0, 0, 255], 'the texture is incomplete before it is enabled, so it samples as black')
  gl.getExtension('OES_texture_half_float_linear')
  t.deepEqual(sampleBetweenTexels(gl), [102, 102, 102, 255], 'the texels are blended once it is enabled')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
