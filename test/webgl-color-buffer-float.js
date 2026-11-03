'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawTriangle = require('./util/draw-triangle')
const makeProgram = require('./util/make-program')

function readFloatPixel (gl) {
  const pixel = new Float32Array(4)
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, pixel)
  return [...pixel]
}

tape('WEBGL_color_buffer_float: availability', function (t) {
  const gl = createContext(1, 1)
  const ext = gl.getExtension('WEBGL_color_buffer_float')
  t.ok(ext, 'available on WebGL1')
  t.equal(ext.RGBA32F_EXT, 0x8814, 'RGBA32F_EXT')
  t.equal(ext.FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE_EXT, 0x8211, 'FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE_EXT')
  t.equal(ext.UNSIGNED_NORMALIZED_EXT, 0x8C17, 'UNSIGNED_NORMALIZED_EXT')
  gl.getExtension('STACKGL_destroy_context').destroy()

  const gl2 = createContext(1, 1, { createWebGL2Context: true })
  t.equal(gl2.getExtension('WEBGL_color_buffer_float'), null, 'not available on WebGL2, which has EXT_color_buffer_float instead')
  gl2.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('WEBGL_color_buffer_float: RGBA32F_EXT renderbuffers', function (t) {
  const gl = createContext(1, 1)
  const ext = gl.getExtension('WEBGL_color_buffer_float')
  const renderbuffer = gl.createRenderbuffer()
  gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer)
  gl.renderbufferStorage(gl.RENDERBUFFER, ext.RGBA32F_EXT, 1, 1)
  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, renderbuffer)
  t.equal(gl.checkFramebufferStatus(gl.FRAMEBUFFER), gl.FRAMEBUFFER_COMPLETE, 'framebuffer is complete')
  t.equal(gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, ext.FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE_EXT), gl.FLOAT, 'component type is FLOAT')

  gl.clearColor(-1, 2, 3, 40)
  gl.clear(gl.COLOR_BUFFER_BIT)
  t.deepEqual(readFloatPixel(gl), [-1, 2, 3, 40], 'readPixels reads floats back without OES_texture_float')

  // As the EXT_float_blend spec requires, enabling WEBGL_color_buffer_float enables it too.
  gl.useProgram(makeProgram(gl, `attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`, `precision highp float;
void main() {
  gl_FragColor = vec4(0.5, -2.0, 3.0, 1.0);
}`))
  gl.clearColor(1, 1, 1, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE)
  drawTriangle(gl)
  t.deepEqual(readFloatPixel(gl), [1.5, -1, 4, 2], 'blends onto the renderbuffer')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('WEBGL_color_buffer_float: float textures still need OES_texture_float', function (t) {
  const gl = createContext(1, 1)
  gl.getExtension('WEBGL_color_buffer_float')
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.FLOAT, null)
  t.equal(gl.getError(), gl.INVALID_ENUM, 'texImage2D sets INVALID_ENUM')
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 1, gl.RGBA, gl.FLOAT, new Float32Array(4))
  t.equal(gl.getError(), gl.INVALID_ENUM, 'texSubImage2D sets INVALID_ENUM')

  gl.getExtension('OES_texture_float')
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.FLOAT, null)
  t.equal(gl.getError(), gl.NO_ERROR, 'texImage2D works once OES_texture_float is enabled')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
