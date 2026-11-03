'use strict'

const tape = require('tape')
const createContext = require('../index')

tape('vertexAttrib*fv: arrays that are too short and indices out of range', function (t) {
  const gl = createContext(1, 1)
  const outOfRange = gl.getParameter(gl.MAX_VERTEX_ATTRIBS)

  for (let size = 1; size <= 4; size++) {
    const method = `vertexAttrib${size}fv`
    gl[method](0, new Array(size - 1).fill(1))
    t.equal(gl.getError(), gl.INVALID_VALUE, `${method} sets INVALID_VALUE with ${size - 1} values`)
    gl[method](outOfRange, new Array(size).fill(1))
    t.equal(gl.getError(), gl.INVALID_VALUE, `${method} sets INVALID_VALUE with an index out of range`)
  }

  gl.vertexAttrib4fv(1, [1, 2, 3, 4])
  t.deepEqual([...gl.getVertexAttrib(1, gl.CURRENT_VERTEX_ATTRIB)], [1, 2, 3, 4], 'vertexAttrib4fv still sets the attribute')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
