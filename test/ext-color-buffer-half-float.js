'use strict'

const tape = require('tape')
const createContext = require('../index')

function readFloatPixel (gl) {
  const pixel = new Float32Array(4)
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, pixel)
  return [...pixel]
}

tape('EXT_color_buffer_half_float: availability', function (t) {
  const gl2 = createContext(1, 1, { createWebGL2Context: true })
  const ext = gl2.getExtension('EXT_color_buffer_half_float')
  t.ok(ext, 'available on WebGL2')
  t.equal(ext.RGBA16F_EXT, 0x881A, 'RGBA16F_EXT')
  t.equal(ext.RGB16F_EXT, 0x881B, 'RGB16F_EXT')
  t.equal(ext.FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE_EXT, 0x8211, 'FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE_EXT')
  t.equal(ext.UNSIGNED_NORMALIZED_EXT, 0x8C17, 'UNSIGNED_NORMALIZED_EXT')
  gl2.getExtension('STACKGL_destroy_context').destroy()

  // ANGLE only makes 16-bit float color buffers renderable on WebGL1 along with half-float textures, which headless-gl doesn't offer yet.
  const gl = createContext(1, 1)
  t.equal(gl.getExtension('EXT_color_buffer_half_float'), null, 'not available on WebGL1 yet')
  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('EXT_color_buffer_half_float: RGBA16F renderbuffers', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const renderbuffer = gl.createRenderbuffer()
  gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer)

  gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA16F, 1, 1)
  t.equal(gl.getError(), gl.INVALID_ENUM, 'renderbufferStorage sets INVALID_ENUM before it is enabled')

  gl.getExtension('EXT_color_buffer_half_float')
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA16F, 1, 1)
  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, renderbuffer)
  t.equal(gl.checkFramebufferStatus(gl.FRAMEBUFFER), gl.FRAMEBUFFER_COMPLETE, 'the framebuffer is complete')
  t.equal(gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE), gl.FLOAT, 'the component type is FLOAT')

  gl.clearColor(-1, 2, 3, 40)
  gl.clear(gl.COLOR_BUFFER_BIT)
  t.deepEqual(readFloatPixel(gl), [-1, 2, 3, 40], 'reads floats back')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('EXT_color_buffer_half_float: RGBA16F textures', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 1, 1, 0, gl.RGBA, gl.HALF_FLOAT, null)
  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
  t.equal(gl.checkFramebufferStatus(gl.FRAMEBUFFER), gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT, 'the framebuffer is incomplete before it is enabled')

  gl.getExtension('EXT_color_buffer_half_float')
  t.equal(gl.checkFramebufferStatus(gl.FRAMEBUFFER), gl.FRAMEBUFFER_COMPLETE, 'the framebuffer is complete once it is enabled')

  gl.clearColor(0.5, -0.25, 1000, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)
  t.deepEqual(readFloatPixel(gl), [0.5, -0.25, 1000, 1], 'reads floats back')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
