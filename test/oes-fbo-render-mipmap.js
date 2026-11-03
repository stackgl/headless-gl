'use strict'

const tape = require('tape')
const createContext = require('../index')

function readPixel (gl) {
  const pixel = new Uint8Array(4)
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
  return [...pixel]
}

tape('OES_fbo_render_mipmap: availability', function (t) {
  const gl = createContext(1, 1)
  t.ok(gl.getExtension('OES_fbo_render_mipmap'), 'available on WebGL1')
  gl.getExtension('STACKGL_destroy_context').destroy()

  const gl2 = createContext(1, 1, { createWebGL2Context: true })
  t.equal(gl2.getExtension('OES_fbo_render_mipmap'), null, 'not available on WebGL2, which can render to any mipmap level')
  gl2.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('OES_fbo_render_mipmap: rendering to a mipmap level', function (t) {
  const gl = createContext(1, 1)
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.texImage2D(gl.TEXTURE_2D, 1, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 1)
  t.equal(gl.getError(), gl.INVALID_VALUE, 'attaching level 1 sets INVALID_VALUE before it is enabled')

  gl.getExtension('OES_fbo_render_mipmap')
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 1)
  t.equal(gl.checkFramebufferStatus(gl.FRAMEBUFFER), gl.FRAMEBUFFER_COMPLETE, 'the framebuffer is complete with level 1 attached')
  t.equal(gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL), 1, 'FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL is 1')
  gl.clearColor(0, 1, 0, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)
  t.deepEqual(readPixel(gl), [0, 255, 0, 255], 'level 1 is cleared')

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
  t.deepEqual(readPixel(gl), [0, 0, 0, 0], 'level 0 is untouched')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
