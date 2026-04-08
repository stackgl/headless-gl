'use strict'

const tape = require('tape')
const createContext = require('../index.js')

tape('cube map', function (t) {
  const width = 64
  const height = 64

  const gl = createContext(width, height)

  const tex = gl.createTexture()
  const fb = gl.createFramebuffer()
  const img = new Uint8Array([255, 255, 255, 255])

  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex)
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST)

  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)

  for (let i = 0; i < 6; i++) {
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, tex, 0)
  }

  t.equals(gl.getError(), gl.NO_ERROR, 'checking for gl error after attaching cubemap textures')

  t.end()
})
