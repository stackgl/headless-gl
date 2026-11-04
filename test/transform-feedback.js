'use strict'

const tape = require('tape')
const createContext = require('../index')
const compileShader = require('./util/make-shader')

// The names are longer than a short string's inline storage, so each one is on the heap.
const VERTEX_SHADER = `#version 300 es
out float doubledVertexIndex;
out float tripledVertexIndex;
void main() {
  doubledVertexIndex = float(gl_VertexID) * 2.0;
  tripledVertexIndex = float(gl_VertexID) * 3.0;
  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
  gl_PointSize = 1.0;
}`

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
out vec4 color;
void main() {
  color = vec4(1.0);
}`

const VARYINGS = ['doubledVertexIndex', 'tripledVertexIndex']

function createProgram (gl, varyings, bufferMode) {
  const program = gl.createProgram()
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER))
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER))
  gl.transformFeedbackVaryings(program, varyings, bufferMode)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program))
  }
  return program
}

// Draws count points with transform feedback into the buffers, which are bound to the transform feedback binding points in order.
function capture (gl, program, buffers, count) {
  buffers.forEach((buffer, index) => gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, index, buffer))
  gl.useProgram(program)
  gl.enable(gl.RASTERIZER_DISCARD)
  gl.beginTransformFeedback(gl.POINTS)
  gl.drawArrays(gl.POINTS, 0, count)
  gl.endTransformFeedback()
  gl.disable(gl.RASTERIZER_DISCARD)
  buffers.forEach((buffer, index) => gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, index, null))
}

function createBuffer (gl, size) {
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.COPY_WRITE_BUFFER, buffer)
  gl.bufferData(gl.COPY_WRITE_BUFFER, size, gl.STATIC_READ)
  gl.bindBuffer(gl.COPY_WRITE_BUFFER, null)
  return buffer
}

function readBuffer (gl, buffer, length) {
  const data = new Float32Array(length)
  gl.bindBuffer(gl.COPY_READ_BUFFER, buffer)
  gl.getBufferSubData(gl.COPY_READ_BUFFER, 0, data)
  gl.bindBuffer(gl.COPY_READ_BUFFER, null)
  return [...data]
}

tape('transform feedback: transformFeedbackVaryings and getTransformFeedbackVarying take a WebGLProgram', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const program = createProgram(gl, VARYINGS, gl.INTERLEAVED_ATTRIBS)

  VARYINGS.forEach((name, index) => {
    const info = gl.getTransformFeedbackVarying(program, index)
    t.equal(info.constructor.name, 'WebGLActiveInfo', `getTransformFeedbackVarying(${index}) returns a WebGLActiveInfo`)
    t.deepEqual([info.name, info.size, info.type], [name, 1, gl.FLOAT], `for ${name}`)
  })
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  t.equal(gl.getTransformFeedbackVarying(program, 2), null, 'getTransformFeedbackVarying returns null past the last varying')
  t.equal(gl.getError(), gl.INVALID_VALUE, 'and sets INVALID_VALUE')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('transform feedback: capturing varyings', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  const interleaved = createBuffer(gl, 6 * 4)
  capture(gl, createProgram(gl, VARYINGS, gl.INTERLEAVED_ATTRIBS), [interleaved], 3)
  t.deepEqual(readBuffer(gl, interleaved, 6), [0, 0, 2, 3, 4, 6], 'INTERLEAVED_ATTRIBS writes the varyings of each vertex together')

  const doubled = createBuffer(gl, 3 * 4)
  const tripled = createBuffer(gl, 3 * 4)
  capture(gl, createProgram(gl, VARYINGS, gl.SEPARATE_ATTRIBS), [doubled, tripled], 3)
  t.deepEqual(readBuffer(gl, doubled, 3), [0, 2, 4], 'SEPARATE_ATTRIBS writes the first varying to the first buffer')
  t.deepEqual(readBuffer(gl, tripled, 3), [0, 3, 6], 'and the second to the second')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('transform feedback: transformFeedbackVaryings and getTransformFeedbackVarying errors', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const other = createContext(1, 1, { createWebGL2Context: true })
  const program = gl.createProgram()

  t.throws(() => gl.transformFeedbackVaryings(1, VARYINGS, gl.SEPARATE_ATTRIBS), TypeError, 'transformFeedbackVaryings throws a TypeError for a program that isn\'t an object')
  t.throws(() => gl.transformFeedbackVaryings(program, 'doubledVertexIndex', gl.SEPARATE_ATTRIBS), TypeError, 'and for varyings that aren\'t a sequence')
  t.throws(() => gl.getTransformFeedbackVarying(1, 0), TypeError, 'getTransformFeedbackVarying throws a TypeError for a program that isn\'t an object')

  gl.transformFeedbackVaryings(null, VARYINGS, gl.SEPARATE_ATTRIBS)
  t.equal(gl.getError(), gl.INVALID_VALUE, 'transformFeedbackVaryings sets INVALID_VALUE for a null program')
  gl.transformFeedbackVaryings(other.createProgram(), VARYINGS, gl.SEPARATE_ATTRIBS)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'and INVALID_OPERATION for another context\'s program')
  gl.transformFeedbackVaryings(program, new Set(VARYINGS), gl.SEPARATE_ATTRIBS)
  t.equal(gl.getError(), gl.NO_ERROR, 'and takes any iterable of names')

  t.equal(gl.getTransformFeedbackVarying(null, 0), null, 'getTransformFeedbackVarying returns null for a null program')
  t.equal(gl.getError(), gl.INVALID_VALUE, 'and sets INVALID_VALUE')
  t.equal(gl.getTransformFeedbackVarying(other.createProgram(), 0), null, 'and null for another context\'s program')
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'and sets INVALID_OPERATION')
  t.equal(gl.getTransformFeedbackVarying(program, 0), null, 'and null for a program that hasn\'t been linked')
  t.equal(gl.getError(), gl.INVALID_VALUE, 'and sets INVALID_VALUE')

  other.getExtension('STACKGL_destroy_context').destroy()
  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
