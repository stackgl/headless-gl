'use strict'

const tape = require('tape')
const createContext = require('../index')

tape('getParameter: WebGL1 capabilities are booleans', function (t) {
  const gl = createContext(1, 1)

  for (const name of ['SAMPLE_ALPHA_TO_COVERAGE', 'SAMPLE_COVERAGE']) {
    t.equal(gl.getParameter(gl[name]), false, `${name} is false by default`)
    gl.enable(gl[name])
    t.equal(gl.getParameter(gl[name]), true, 'and true once enabled')
  }
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('getParameter: WebGL2 capabilities and transform feedback states are booleans', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  for (const name of ['SAMPLE_ALPHA_TO_COVERAGE', 'SAMPLE_COVERAGE', 'RASTERIZER_DISCARD']) {
    t.equal(gl.getParameter(gl[name]), false, `${name} is false by default`)
    gl.enable(gl[name])
    t.equal(gl.getParameter(gl[name]), true, 'and true once enabled')
  }
  t.equal(gl.getParameter(gl.TRANSFORM_FEEDBACK_ACTIVE), false, 'TRANSFORM_FEEDBACK_ACTIVE is false')
  t.equal(gl.getParameter(gl.TRANSFORM_FEEDBACK_PAUSED), false, 'TRANSFORM_FEEDBACK_PAUSED is false')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('getParameter: WebGL2 texture and vertex array bindings are objects', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  const texture3D = gl.createTexture()
  const texture2DArray = gl.createTexture()
  const vertexArray = gl.createVertexArray()
  t.equal(gl.getParameter(gl.TEXTURE_BINDING_3D), null, 'TEXTURE_BINDING_3D is null by default')
  t.equal(gl.getParameter(gl.TEXTURE_BINDING_2D_ARRAY), null, 'TEXTURE_BINDING_2D_ARRAY is null by default')
  t.equal(gl.getParameter(gl.VERTEX_ARRAY_BINDING), null, 'VERTEX_ARRAY_BINDING is null by default')

  gl.bindTexture(gl.TEXTURE_3D, texture3D)
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture2DArray)
  gl.bindVertexArray(vertexArray)
  t.equal(gl.getParameter(gl.TEXTURE_BINDING_3D), texture3D, 'TEXTURE_BINDING_3D is the bound texture')
  t.equal(gl.getParameter(gl.TEXTURE_BINDING_2D_ARRAY), texture2DArray, 'TEXTURE_BINDING_2D_ARRAY is the bound texture')
  t.equal(gl.getParameter(gl.VERTEX_ARRAY_BINDING), vertexArray, 'VERTEX_ARRAY_BINDING is the bound vertex array')

  gl.activeTexture(gl.TEXTURE1)
  t.equal(gl.getParameter(gl.TEXTURE_BINDING_3D), null, 'the texture bindings are per texture unit')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('getParameter: WebGL1 has no WebGL2 bindings', function (t) {
  const gl = createContext(1, 1)

  // TEXTURE_BINDING_3D, TEXTURE_BINDING_2D_ARRAY and VERTEX_ARRAY_BINDING.
  for (const pname of [0x806A, 0x8C1D, 0x85B5]) {
    t.equal(gl.getParameter(pname), null, `0x${pname.toString(16)} is null`)
    t.equal(gl.getError(), gl.INVALID_ENUM, 'and sets INVALID_ENUM')
  }

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
