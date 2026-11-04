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
