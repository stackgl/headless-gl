'use strict'

const tape = require('tape')
const createContext = require('../index')

tape('draw buffers: WebGL1 WEBGL_draw_buffers reports BACK for the default framebuffer', function (t) {
  const gl = createContext(1, 1)
  const ext = gl.getExtension('WEBGL_draw_buffers')

  t.equal(gl.getParameter(ext.DRAW_BUFFER0_WEBGL), gl.BACK, 'DRAW_BUFFER0_WEBGL is BACK')
  ext.drawBuffersWEBGL([gl.NONE])
  t.equal(gl.getParameter(ext.DRAW_BUFFER0_WEBGL), gl.NONE, 'and NONE after drawBuffersWEBGL([NONE])')
  ext.drawBuffersWEBGL([gl.BACK])
  t.equal(gl.getParameter(ext.DRAW_BUFFER0_WEBGL), gl.BACK, 'and BACK again after drawBuffersWEBGL([BACK])')

  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())
  t.equal(gl.getParameter(ext.DRAW_BUFFER0_WEBGL), ext.COLOR_ATTACHMENT0_WEBGL, 'but COLOR_ATTACHMENT0_WEBGL for a framebuffer object')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('draw buffers: WebGL2 reports BACK for the default framebuffer', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  t.equal(gl.getParameter(gl.DRAW_BUFFER0), gl.BACK, 'DRAW_BUFFER0 is BACK')
  t.equal(gl.getParameter(gl.READ_BUFFER), gl.BACK, 'and READ_BUFFER')
  gl.drawBuffers([gl.NONE])
  gl.readBuffer(gl.NONE)
  t.equal(gl.getParameter(gl.DRAW_BUFFER0), gl.NONE, 'DRAW_BUFFER0 is NONE after drawBuffers([NONE])')
  t.equal(gl.getParameter(gl.READ_BUFFER), gl.NONE, 'and READ_BUFFER after readBuffer(NONE)')
  gl.drawBuffers([gl.BACK])
  gl.readBuffer(gl.BACK)
  t.equal(gl.getParameter(gl.DRAW_BUFFER0), gl.BACK, 'DRAW_BUFFER0 is BACK again after drawBuffers([BACK])')
  t.equal(gl.getParameter(gl.READ_BUFFER), gl.BACK, 'and READ_BUFFER after readBuffer(BACK)')

  const framebuffer = gl.createFramebuffer()
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, framebuffer)
  t.equal(gl.getParameter(gl.DRAW_BUFFER0), gl.COLOR_ATTACHMENT0, 'DRAW_BUFFER0 is COLOR_ATTACHMENT0 for a framebuffer object')
  t.equal(gl.getParameter(gl.READ_BUFFER), gl.BACK, 'while READ_BUFFER is still BACK for the default read framebuffer')
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer)
  t.equal(gl.getParameter(gl.READ_BUFFER), gl.COLOR_ATTACHMENT0, 'and COLOR_ATTACHMENT0 once a framebuffer object is bound to read from')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('draw buffers: WebGL2 drawBuffers and readBuffer take BACK only for the default framebuffer', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  for (const buffers of [[gl.COLOR_ATTACHMENT0], [gl.BACK, gl.NONE], []]) {
    gl.drawBuffers(buffers)
    t.equal(gl.getError(), gl.INVALID_OPERATION, `drawBuffers([${buffers}]) sets INVALID_OPERATION for the default framebuffer`)
  }
  gl.readBuffer(gl.COLOR_ATTACHMENT0)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'and so does readBuffer(COLOR_ATTACHMENT0)')
  gl.readBuffer(gl.TEXTURE_2D)
  t.equal(gl.getError(), gl.INVALID_ENUM, 'while readBuffer sets INVALID_ENUM for a value that isn\'t a buffer')
  t.equal(gl.getParameter(gl.DRAW_BUFFER0), gl.BACK, 'DRAW_BUFFER0 is still BACK')
  t.equal(gl.getParameter(gl.READ_BUFFER), gl.BACK, 'and READ_BUFFER')

  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())
  gl.drawBuffers([gl.BACK])
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'drawBuffers([BACK]) sets INVALID_OPERATION for a framebuffer object')
  gl.readBuffer(gl.BACK)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'and so does readBuffer(BACK)')
  gl.drawBuffers([gl.NONE, gl.COLOR_ATTACHMENT1])
  gl.readBuffer(gl.COLOR_ATTACHMENT1)
  t.equal(gl.getError(), gl.NO_ERROR, 'while color attachments work')
  t.deepEqual([gl.getParameter(gl.DRAW_BUFFER0), gl.getParameter(gl.DRAW_BUFFER0 + 1), gl.getParameter(gl.READ_BUFFER)], [gl.NONE, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT1], 'and set the draw and read buffers')

  t.throws(() => gl.drawBuffers(gl.NONE), TypeError, 'drawBuffers throws a TypeError for a value that isn\'t a sequence')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('draw buffers: WebGL1 drawBuffersWEBGL takes BACK only for the default framebuffer', function (t) {
  const gl = createContext(1, 1)
  const ext = gl.getExtension('WEBGL_draw_buffers')

  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())
  ext.drawBuffersWEBGL([gl.BACK])
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'drawBuffersWEBGL([BACK]) sets INVALID_OPERATION for a framebuffer object')
  t.equal(gl.getParameter(ext.DRAW_BUFFER0_WEBGL), ext.COLOR_ATTACHMENT0_WEBGL, 'and leaves DRAW_BUFFER0_WEBGL')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('draw buffers: WebGL1 sets INVALID_ENUM for color attachments past the last', function (t) {
  const gl = createContext(1, 1)
  const ext = gl.getExtension('WEBGL_draw_buffers')
  const max = gl.getParameter(ext.MAX_COLOR_ATTACHMENTS_WEBGL)

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  const renderbuffer = gl.createRenderbuffer()
  gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer)
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA4, 1, 1)
  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + max, gl.TEXTURE_2D, texture, 0)
  t.equal(gl.getError(), gl.INVALID_ENUM, 'framebufferTexture2D sets INVALID_ENUM for COLOR_ATTACHMENT0 + MAX_COLOR_ATTACHMENTS_WEBGL')
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + max, gl.RENDERBUFFER, renderbuffer)
  t.equal(gl.getError(), gl.INVALID_ENUM, 'and so does framebufferRenderbuffer')
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + max - 1, gl.TEXTURE_2D, texture, 0)
  t.equal(gl.getError(), gl.NO_ERROR, 'while the last color attachment works')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('draw buffers: WebGL2 sets INVALID_ENUM for color attachments past the last', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const max = gl.getParameter(gl.MAX_COLOR_ATTACHMENTS)

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  const textureArray = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, textureArray)
  gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  const renderbuffer = gl.createRenderbuffer()
  gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer)
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA4, 1, 1)
  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())

  // OpenGL ES sets INVALID_OPERATION, but browsers set INVALID_ENUM.
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + max, gl.TEXTURE_2D, texture, 0)
  t.equal(gl.getError(), gl.INVALID_ENUM, 'framebufferTexture2D sets INVALID_ENUM for COLOR_ATTACHMENT0 + MAX_COLOR_ATTACHMENTS')
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + max, gl.RENDERBUFFER, renderbuffer)
  t.equal(gl.getError(), gl.INVALID_ENUM, 'and so does framebufferRenderbuffer')
  gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + max, textureArray, 0, 0)
  t.equal(gl.getError(), gl.INVALID_ENUM, 'and framebufferTextureLayer')
  t.equal(gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + max, gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE), null, 'getFramebufferAttachmentParameter returns null for it')
  t.equal(gl.getError(), gl.INVALID_ENUM, 'and sets INVALID_ENUM')
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + max - 1, gl.TEXTURE_2D, texture, 0)
  t.equal(gl.getError(), gl.NO_ERROR, 'while the last color attachment works')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
