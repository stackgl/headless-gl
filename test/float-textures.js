'use strict'

const tape = require('tape')
const createContext = require('../index')

function setup () {
  const gl = createContext(2, 2)
  gl.getExtension('OES_texture_float')
  return gl
}

tape('float textures: cube map faces', function (t) {
  const gl = setup()
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, gl.createTexture())
  for (let face = 0; face < 6; face++) {
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + face, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.FLOAT, null)
    t.equal(gl.getError(), gl.NO_ERROR, `face ${face}`)
  }
  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('float textures: resize and mipmap levels', function (t) {
  const gl = setup()
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.FLOAT, null)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.FLOAT, null)
  t.equal(gl.getError(), gl.NO_ERROR, 'upload again at a new size')
  gl.texImage2D(gl.TEXTURE_2D, 1, gl.RGBA, 1, 1, 0, gl.RGBA, gl.FLOAT, null)
  t.equal(gl.getError(), gl.NO_ERROR, 'upload mipmap level 1')
  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('float textures: render target', function (t) {
  const gl = setup()
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.FLOAT, new Float32Array([-5, 2.5, 0.25, 1]))
  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
  t.equal(gl.checkFramebufferStatus(gl.FRAMEBUFFER), gl.FRAMEBUFFER_COMPLETE, 'framebuffer is complete')

  const pixels = new Float32Array(4)
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, pixels)
  t.deepEqual([...pixels], [-5, 2.5, 0.25, 1], 'keeps uploaded values outside 0 to 1')
  gl.clearColor(-1, 2, 3, 40)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, pixels)
  t.deepEqual([...pixels], [-1, 2, 3, 40], 'keeps cleared values outside 0 to 1')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')
  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
