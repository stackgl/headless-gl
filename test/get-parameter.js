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
