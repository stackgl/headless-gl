'use strict'

const tape = require('tape')
const createContext = require('../index')

const RGBA16F_EXT = 0x881A
const HALF_FLOAT_OES = 0x8D61

function readFloatPixel (gl) {
  const pixel = new Float32Array(4)
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, pixel)
  return [...pixel]
}

for (const webgl2 of [false, true]) {
  tape(`EXT_color_buffer_half_float: WebGL${webgl2 ? 2 : 1} RGBA16F renderbuffers`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })
    const renderbuffer = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer)

    gl.renderbufferStorage(gl.RENDERBUFFER, RGBA16F_EXT, 1, 1)
    t.equal(gl.getError(), gl.INVALID_ENUM, 'renderbufferStorage sets INVALID_ENUM before it is enabled')

    const ext = gl.getExtension('EXT_color_buffer_half_float')
    t.ok(ext, 'available')
    t.equal(ext.RGBA16F_EXT, RGBA16F_EXT, 'RGBA16F_EXT')
    t.equal(ext.RGB16F_EXT, 0x881B, 'RGB16F_EXT')
    t.equal(ext.FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE_EXT, 0x8211, 'FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE_EXT')
    t.equal(ext.UNSIGNED_NORMALIZED_EXT, 0x8C17, 'UNSIGNED_NORMALIZED_EXT')

    gl.renderbufferStorage(gl.RENDERBUFFER, ext.RGBA16F_EXT, 1, 1)
    gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, renderbuffer)
    t.equal(gl.checkFramebufferStatus(gl.FRAMEBUFFER), gl.FRAMEBUFFER_COMPLETE, 'the framebuffer is complete')
    t.equal(gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, ext.FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE_EXT), gl.FLOAT, 'the component type is FLOAT')

    gl.clearColor(-1, 2, 3, 40)
    gl.clear(gl.COLOR_BUFFER_BIT)
    t.deepEqual(readFloatPixel(gl), [-1, 2, 3, 40], 'reads floats back')
    t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}

tape('EXT_color_buffer_half_float: WebGL2 RGBA16F textures', function (t) {
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

tape('EXT_color_buffer_half_float: WebGL1 half-float textures', function (t) {
  const gl = createContext(1, 1)

  // As the OES_texture_half_float spec requires, enabling it enables EXT_color_buffer_half_float too.
  gl.getExtension('OES_texture_half_float')
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, HALF_FLOAT_OES, null)
  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
  t.equal(gl.checkFramebufferStatus(gl.FRAMEBUFFER), gl.FRAMEBUFFER_COMPLETE, 'the framebuffer is complete with only OES_texture_half_float enabled')

  gl.clearColor(0.5, -0.25, 1000, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)
  t.deepEqual(readFloatPixel(gl), [0.5, -0.25, 1000, 1], 'reads floats back')
  t.ok(gl.getExtension('EXT_color_buffer_half_float'), 'getExtension returns the extension')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('EXT_color_buffer_half_float: WebGL1 half-float textures still need OES_texture_half_float', function (t) {
  const gl = createContext(1, 1)
  gl.getExtension('EXT_color_buffer_half_float')
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, HALF_FLOAT_OES, null)
  t.equal(gl.getError(), gl.INVALID_ENUM, 'texImage2D sets INVALID_ENUM')
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 1, gl.RGBA, HALF_FLOAT_OES, new Uint16Array(4))
  t.equal(gl.getError(), gl.INVALID_ENUM, 'texSubImage2D sets INVALID_ENUM')

  gl.getExtension('OES_texture_half_float')
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, HALF_FLOAT_OES, null)
  t.equal(gl.getError(), gl.NO_ERROR, 'texImage2D works once OES_texture_half_float is enabled')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
