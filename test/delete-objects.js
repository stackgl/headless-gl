'use strict'

const tape = require('tape')
const createContext = require('../index')

const WEBGL1_METHODS = ['deleteBuffer', 'deleteFramebuffer', 'deleteProgram', 'deleteRenderbuffer', 'deleteShader', 'deleteTexture']
const WEBGL2_METHODS = [...WEBGL1_METHODS, 'deleteQuery', 'deleteSampler', 'deleteSync', 'deleteTransformFeedback', 'deleteVertexArray']

for (const webgl2 of [false, true]) {
  tape(`delete objects: WebGL${webgl2 ? 2 : 1} delete methods do nothing for null`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })

    const methods = (webgl2 ? WEBGL2_METHODS : WEBGL1_METHODS).map(name => [name, gl[name].bind(gl)])
    if (!webgl2) {
      const ext = gl.getExtension('OES_vertex_array_object')
      methods.push(['deleteVertexArrayOES', ext.deleteVertexArrayOES.bind(ext)])
    }
    for (const [name, method] of methods) {
      method(null)
      t.equal(gl.getError(), gl.NO_ERROR, `${name}(null) sets no error`)
      method(undefined)
      t.equal(gl.getError(), gl.NO_ERROR, `${name}(undefined) sets no error`)
    }

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}

tape('delete objects: deleteTexture unbinds 3D and 2D array textures from every texture unit', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  const texture3D = gl.createTexture()
  const texture2DArray = gl.createTexture()
  gl.activeTexture(gl.TEXTURE2)
  gl.bindTexture(gl.TEXTURE_3D, texture3D)
  gl.activeTexture(gl.TEXTURE3)
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture2DArray)
  gl.activeTexture(gl.TEXTURE1)

  gl.deleteTexture(texture3D)
  gl.deleteTexture(texture2DArray)
  t.equal(gl.getError(), gl.NO_ERROR, 'deleting them sets no error')
  t.equal(gl.getParameter(gl.ACTIVE_TEXTURE), gl.TEXTURE1, 'and leaves the active texture unit')
  gl.activeTexture(gl.TEXTURE2)
  t.equal(gl.getParameter(gl.TEXTURE_BINDING_3D), null, 'the 3D texture is unbound from its unit')
  gl.activeTexture(gl.TEXTURE3)
  t.equal(gl.getParameter(gl.TEXTURE_BINDING_2D_ARRAY), null, 'and the 2D array texture from its unit')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
