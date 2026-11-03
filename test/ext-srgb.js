'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawPixel = require('./util/draw-pixel')

const SRGB_ALPHA_EXT = 0x8C42

// Draws the bound texture's color at the given t coordinate.
function sample (gl, t) {
  return drawPixel(gl, `precision mediump float;
uniform sampler2D sampler;
uniform float t;
void main() {
  gl_FragColor = texture2D(sampler, vec2(0.5, t));
}`, program => gl.uniform1f(gl.getUniformLocation(program, 't'), t))
}

function createTexture (gl) {
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
}

tape('EXT_sRGB: availability', function (t) {
  const gl = createContext(1, 1)
  const ext = gl.getExtension('EXT_sRGB')
  t.ok(ext, 'available on WebGL1')
  t.equal(ext.SRGB_EXT, 0x8C40, 'SRGB_EXT')
  t.equal(ext.SRGB_ALPHA_EXT, SRGB_ALPHA_EXT, 'SRGB_ALPHA_EXT')
  t.equal(ext.SRGB8_ALPHA8_EXT, 0x8C43, 'SRGB8_ALPHA8_EXT')
  t.equal(ext.FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING_EXT, 0x8210, 'FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING_EXT')
  gl.getExtension('STACKGL_destroy_context').destroy()

  const gl2 = createContext(1, 1, { createWebGL2Context: true })
  t.equal(gl2.getExtension('EXT_sRGB'), null, 'not available on WebGL2, which has sRGB formats built in')
  gl2.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('EXT_sRGB: textures', function (t) {
  const gl = createContext(1, 1)
  createTexture(gl)

  gl.texImage2D(gl.TEXTURE_2D, 0, SRGB_ALPHA_EXT, 1, 1, 0, SRGB_ALPHA_EXT, gl.UNSIGNED_BYTE, new Uint8Array([255, 188, 0, 255]))
  t.equal(gl.getError(), gl.INVALID_ENUM, 'texImage2D sets INVALID_ENUM before it is enabled')

  const ext = gl.getExtension('EXT_sRGB')
  gl.texImage2D(gl.TEXTURE_2D, 0, ext.SRGB_ALPHA_EXT, 1, 1, 0, ext.SRGB_ALPHA_EXT, gl.UNSIGNED_BYTE, new Uint8Array([255, 188, 0, 255]))
  t.deepEqual(sample(gl, 0.5), [255, 128, 0, 255], 'SRGB_ALPHA_EXT textures are converted to linear when sampled')
  gl.texImage2D(gl.TEXTURE_2D, 0, ext.SRGB_EXT, 1, 1, 0, ext.SRGB_EXT, gl.UNSIGNED_BYTE, new Uint8Array([255, 188, 0]))
  t.deepEqual(sample(gl, 0.5), [255, 128, 0, 255], 'SRGB_EXT textures too')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('EXT_sRGB: uploads with UNPACK_FLIP_Y_WEBGL and UNPACK_PREMULTIPLY_ALPHA_WEBGL', function (t) {
  const gl = createContext(1, 1)
  const ext = gl.getExtension('EXT_sRGB')
  createTexture(gl)

  // A red row above a green row, which flipping puts at t = 0.25.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, ext.SRGB_ALPHA_EXT, 1, 2, 0, ext.SRGB_ALPHA_EXT, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]))
  t.equal(gl.getError(), gl.NO_ERROR, 'SRGB_ALPHA_EXT texImage2D has no GL error')
  t.deepEqual(sample(gl, 0.25), [0, 255, 0, 255], 'SRGB_ALPHA_EXT rows are flipped')
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
  gl.texImage2D(gl.TEXTURE_2D, 0, ext.SRGB_EXT, 1, 2, 0, ext.SRGB_EXT, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 0, 255, 0]))
  t.equal(gl.getError(), gl.NO_ERROR, 'SRGB_EXT texImage2D has no GL error')
  t.deepEqual(sample(gl, 0.25), [0, 255, 0, 255], 'SRGB_EXT rows are flipped')
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)

  // Premultiplying makes the color 128, which is 55 in linear.
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, ext.SRGB_ALPHA_EXT, 1, 1, 0, ext.SRGB_ALPHA_EXT, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 128]))
  t.deepEqual(sample(gl, 0.5), [55, 55, 55, 128], 'SRGB_ALPHA_EXT colors are premultiplied')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('EXT_sRGB: SRGB8_ALPHA8_EXT renderbuffers', function (t) {
  const gl = createContext(1, 1)
  const ext = gl.getExtension('EXT_sRGB')
  const renderbuffer = gl.createRenderbuffer()
  gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer)
  gl.renderbufferStorage(gl.RENDERBUFFER, ext.SRGB8_ALPHA8_EXT, 1, 1)
  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, renderbuffer)
  t.equal(gl.checkFramebufferStatus(gl.FRAMEBUFFER), gl.FRAMEBUFFER_COMPLETE, 'the framebuffer is complete')
  t.equal(gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, ext.FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING_EXT), ext.SRGB_EXT, 'the color encoding is SRGB_EXT')

  // Linear 0.2159 is 128 in sRGB.
  gl.clearColor(1, 0.2159, 0, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)
  const pixel = new Uint8Array(4)
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
  t.deepEqual([...pixel], [255, 128, 0, 255], 'colors are converted to sRGB when written')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
