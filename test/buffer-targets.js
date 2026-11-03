'use strict'

const tape = require('tape')
const createContext = require('../index')

for (const webgl2 of [false, true]) {
  tape(`buffer targets: WebGL${webgl2 ? 2 : 1} bufferData and bufferSubData with a bad target or no buffer bound`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })

    gl.bufferData(gl.TEXTURE_2D, 4, gl.STATIC_DRAW)
    t.equal(gl.getError(), gl.INVALID_ENUM, 'bufferData with a bad target sets INVALID_ENUM')
    gl.bufferSubData(gl.TEXTURE_2D, 0, new Uint8Array(4))
    t.equal(gl.getError(), gl.INVALID_ENUM, 'bufferSubData with a bad target sets INVALID_ENUM')

    gl.bufferData(gl.ARRAY_BUFFER, 4, gl.STATIC_DRAW)
    t.equal(gl.getError(), gl.INVALID_OPERATION, 'bufferData with no buffer bound sets INVALID_OPERATION')
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Uint8Array(4))
    t.equal(gl.getError(), gl.INVALID_OPERATION, 'bufferSubData with no buffer bound sets INVALID_OPERATION')

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}

const WEBGL2_TARGETS = [
  ['COPY_READ_BUFFER', 'COPY_READ_BUFFER_BINDING'],
  ['COPY_WRITE_BUFFER', 'COPY_WRITE_BUFFER_BINDING'],
  ['PIXEL_PACK_BUFFER', 'PIXEL_PACK_BUFFER_BINDING'],
  ['PIXEL_UNPACK_BUFFER', 'PIXEL_UNPACK_BUFFER_BINDING'],
  ['TRANSFORM_FEEDBACK_BUFFER', 'TRANSFORM_FEEDBACK_BUFFER_BINDING'],
  ['UNIFORM_BUFFER', 'UNIFORM_BUFFER_BINDING']
]

tape('buffer targets: WebGL2 binds, fills and reports buffers at every target', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  for (const [target, binding] of WEBGL2_TARGETS) {
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl[target], buffer)
    t.equal(gl.getParameter(gl[binding]), buffer, `getParameter(${binding}) returns the buffer`)
    gl.bufferData(gl[target], new Uint8Array([1, 2, 3, 4]), gl.STATIC_DRAW)
    gl.bufferSubData(gl[target], 1, new Uint8Array([5]))
    t.equal(gl.getError(), gl.NO_ERROR, `bufferData and bufferSubData at ${target} set no error`)
    t.equal(gl.getBufferParameter(gl[target], gl.BUFFER_SIZE), 4, `getBufferParameter(${target}, BUFFER_SIZE) returns the size`)

    gl.deleteBuffer(buffer)
    t.equal(gl.getParameter(gl[binding]), null, `deleting the buffer unbinds it from ${target}`)
  }

  const uniforms = gl.createBuffer()
  gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, uniforms)
  t.equal(gl.getParameter(gl.UNIFORM_BUFFER_BINDING), uniforms, 'bindBufferBase also binds the buffer to the target')
  t.equal(gl.getIndexedParameter(gl.UNIFORM_BUFFER_BINDING, 0), uniforms, 'getIndexedParameter(UNIFORM_BUFFER_BINDING) returns the buffer')
  t.equal(gl.getIndexedParameter(gl.UNIFORM_BUFFER_BINDING, 1), null, 'or null where none is bound')

  const feedback = gl.createBuffer()
  gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, feedback)
  gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, 16, gl.STATIC_DRAW)
  gl.bindBufferRange(gl.TRANSFORM_FEEDBACK_BUFFER, 0, feedback, 4, 8)
  t.equal(gl.getIndexedParameter(gl.TRANSFORM_FEEDBACK_BUFFER_BINDING, 0), feedback, 'getIndexedParameter(TRANSFORM_FEEDBACK_BUFFER_BINDING) returns the buffer')
  t.equal(gl.getIndexedParameter(gl.TRANSFORM_FEEDBACK_BUFFER_START, 0), 4, 'and the range\'s start')
  t.equal(gl.getIndexedParameter(gl.TRANSFORM_FEEDBACK_BUFFER_SIZE, 0), 8, 'and size')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('buffer targets: WebGL2 keeps element array buffers apart from other data', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  const elements = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elements)
  gl.bindBuffer(gl.COPY_READ_BUFFER, elements)
  t.equal(gl.getError(), gl.NO_ERROR, 'an element array buffer can be bound to COPY_READ_BUFFER')
  gl.bindBuffer(gl.UNIFORM_BUFFER, elements)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'but not to UNIFORM_BUFFER')
  gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, elements)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'nor with bindBufferBase')
  t.equal(gl.getParameter(gl.UNIFORM_BUFFER_BINDING), null, 'and the binding is unchanged')

  const data = gl.createBuffer()
  gl.bindBuffer(gl.COPY_WRITE_BUFFER, data)
  gl.bindBuffer(gl.ARRAY_BUFFER, data)
  t.equal(gl.getError(), gl.NO_ERROR, 'a buffer first bound to COPY_WRITE_BUFFER can be bound to ARRAY_BUFFER')
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, data)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'but not to ELEMENT_ARRAY_BUFFER')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('buffer targets: WebGL1 has none of the WebGL2 targets', function (t) {
  const gl = createContext(1, 1)
  const buffer = gl.createBuffer()
  gl.bindBuffer(0x88EB, buffer) // PIXEL_PACK_BUFFER
  t.equal(gl.getError(), gl.INVALID_ENUM, 'bindBuffer(PIXEL_PACK_BUFFER) sets INVALID_ENUM')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('buffer targets: bufferData takes the WebGL2 usages only in WebGL2', function (t) {
  const usages = ['STREAM_READ', 'STREAM_COPY', 'STATIC_READ', 'STATIC_COPY', 'DYNAMIC_READ', 'DYNAMIC_COPY']

  const gl2 = createContext(1, 1, { createWebGL2Context: true })
  gl2.bindBuffer(gl2.ARRAY_BUFFER, gl2.createBuffer())
  for (const usage of usages) {
    gl2.bufferData(gl2.ARRAY_BUFFER, 4, gl2[usage])
    t.equal(gl2.getBufferParameter(gl2.ARRAY_BUFFER, gl2.BUFFER_USAGE), gl2[usage], `WebGL2 takes ${usage}`)
  }
  t.equal(gl2.getError(), gl2.NO_ERROR, 'and sets no error')
  gl2.getExtension('STACKGL_destroy_context').destroy()

  const gl = createContext(1, 1)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, 4, 0x88E1) // STREAM_READ
  t.equal(gl.getError(), gl.INVALID_ENUM, 'WebGL1 sets INVALID_ENUM for STREAM_READ')
  gl.getExtension('STACKGL_destroy_context').destroy()

  t.end()
})

tape('buffer targets: getBufferSubData reads a buffer back', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  gl.bindBuffer(gl.COPY_READ_BUFFER, gl.createBuffer())
  gl.bufferData(gl.COPY_READ_BUFFER, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), gl.STATIC_DRAW)

  const bytes = new Uint8Array(8)
  gl.getBufferSubData(gl.COPY_READ_BUFFER, 0, bytes)
  t.deepEqual([...bytes], [1, 2, 3, 4, 5, 6, 7, 8], 'into a whole array')

  const shorts = new Uint16Array(4)
  gl.getBufferSubData(gl.COPY_READ_BUFFER, 2, shorts, 1, 2)
  t.deepEqual([...new Uint8Array(shorts.buffer)], [0, 0, 3, 4, 5, 6, 0, 0], 'length elements from dstOffset elements in')

  // A view into the middle of a larger buffer, so bytes written outside the view can be seen.
  const backing = new Uint8Array(8)
  gl.getBufferSubData(gl.COPY_READ_BUFFER, 4, new DataView(backing.buffer, 2, 4), 1)
  t.deepEqual([...backing], [0, 0, 0, 5, 6, 7, 0, 0], 'into a DataView, whose elements are bytes')
  t.equal(gl.getError(), gl.NO_ERROR, 'and sets no error')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('buffer targets: getBufferSubData with bad arguments', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const dst = new Uint8Array(4)

  gl.getBufferSubData(gl.TEXTURE_2D, 0, dst)
  t.equal(gl.getError(), gl.INVALID_ENUM, 'a bad target sets INVALID_ENUM')
  gl.getBufferSubData(gl.COPY_READ_BUFFER, 0, dst)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'no buffer bound sets INVALID_OPERATION')

  gl.bindBuffer(gl.COPY_READ_BUFFER, gl.createBuffer())
  gl.bufferData(gl.COPY_READ_BUFFER, new Uint8Array([1, 2, 3, 4]), gl.STATIC_DRAW)
  gl.getBufferSubData(gl.COPY_READ_BUFFER, -1, dst)
  t.equal(gl.getError(), gl.INVALID_VALUE, 'a negative srcByteOffset sets INVALID_VALUE')
  gl.getBufferSubData(gl.COPY_READ_BUFFER, 0, dst, 5)
  t.equal(gl.getError(), gl.INVALID_VALUE, 'a dstOffset past the end of dstBuffer sets INVALID_VALUE')
  gl.getBufferSubData(gl.COPY_READ_BUFFER, 0, dst, 2, 3)
  t.equal(gl.getError(), gl.INVALID_VALUE, 'a length past the end of dstBuffer sets INVALID_VALUE')
  gl.getBufferSubData(gl.COPY_READ_BUFFER, 2, dst)
  t.equal(gl.getError(), gl.INVALID_VALUE, 'reading past the end of the buffer sets INVALID_VALUE')
  t.deepEqual([...dst], [0, 0, 0, 0], 'and none of these write to dstBuffer')

  gl.getBufferSubData(gl.COPY_READ_BUFFER, 0, dst, 4)
  t.equal(gl.getError(), gl.NO_ERROR, 'reading nothing sets no error')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
