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
