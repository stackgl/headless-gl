'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawPixel = require('./util/draw-pixel')

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
out vec4 color;
void main() {
  color = vec4(1.0);
}`

tape('queries: createQuery returns a WebGLQuery', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  const query = gl.createQuery()
  t.equal(query.constructor.name, 'WebGLQuery', 'createQuery returns a WebGLQuery')
  t.equal(gl.isQuery(query), false, 'which isn\'t a query to isQuery until it\'s begun, as in OpenGL ES')

  t.equal(gl.getQuery(gl.ANY_SAMPLES_PASSED, gl.CURRENT_QUERY), null, 'CURRENT_QUERY is null by default')
  gl.beginQuery(gl.ANY_SAMPLES_PASSED, query)
  t.equal(gl.isQuery(query), true, 'isQuery returns true once it\'s begun')
  t.equal(gl.getQuery(gl.ANY_SAMPLES_PASSED, gl.CURRENT_QUERY), query, 'and CURRENT_QUERY is the query while it\'s active')
  t.equal(gl.getQuery(gl.ANY_SAMPLES_PASSED_CONSERVATIVE, gl.CURRENT_QUERY), null, 'but only for its own target')
  gl.endQuery(gl.ANY_SAMPLES_PASSED)
  t.equal(gl.getQuery(gl.ANY_SAMPLES_PASSED, gl.CURRENT_QUERY), null, 'and null once it ends')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.deleteQuery(query)
  t.equal(gl.isQuery(query), false, 'isQuery returns false once it\'s deleted')
  gl.deleteQuery(query)
  gl.deleteQuery(null)
  t.equal(gl.getError(), gl.NO_ERROR, 'deleting it again, or deleting null, does nothing')
  gl.beginQuery(gl.ANY_SAMPLES_PASSED, query)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'beginQuery sets INVALID_OPERATION for a deleted query')
  t.equal(gl.getQueryParameter(query, gl.QUERY_RESULT), null, 'getQueryParameter returns null for it')
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'and sets INVALID_OPERATION')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('queries: occlusion query results', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  const drawn = gl.createQuery()
  gl.beginQuery(gl.ANY_SAMPLES_PASSED, drawn)
  drawPixel(gl, FRAGMENT_SHADER)
  gl.endQuery(gl.ANY_SAMPLES_PASSED)

  const hidden = gl.createQuery()
  gl.enable(gl.SCISSOR_TEST)
  gl.scissor(0, 0, 0, 0)
  gl.beginQuery(gl.ANY_SAMPLES_PASSED_CONSERVATIVE, hidden)
  drawPixel(gl, FRAGMENT_SHADER)
  gl.endQuery(gl.ANY_SAMPLES_PASSED_CONSERVATIVE)
  gl.disable(gl.SCISSOR_TEST)

  t.equal(gl.getQueryParameter(drawn, gl.QUERY_RESULT), 1, 'QUERY_RESULT is 1 when samples passed')
  t.equal(gl.getQueryParameter(hidden, gl.QUERY_RESULT), 0, 'and 0 when none did')
  t.equal(gl.getQueryParameter(drawn, gl.QUERY_RESULT_AVAILABLE), true, 'QUERY_RESULT_AVAILABLE is a boolean')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  t.equal(gl.getQueryParameter(drawn, gl.CURRENT_QUERY), null, 'getQueryParameter returns null for a parameter queries don\'t have')
  t.equal(gl.getError(), gl.INVALID_ENUM, 'and sets INVALID_ENUM')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('queries: deleting an active query ends it', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  const query = gl.createQuery()
  gl.beginQuery(gl.ANY_SAMPLES_PASSED, query)
  gl.deleteQuery(query)
  t.equal(gl.getQuery(gl.ANY_SAMPLES_PASSED, gl.CURRENT_QUERY), null, 'CURRENT_QUERY is null once the query is deleted')
  gl.beginQuery(gl.ANY_SAMPLES_PASSED, gl.createQuery())
  t.equal(gl.getError(), gl.NO_ERROR, 'and another query can begin')
  gl.endQuery(gl.ANY_SAMPLES_PASSED)

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('queries: errors', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const other = createContext(1, 1, { createWebGL2Context: true })
  const query = gl.createQuery()
  const otherQuery = other.createQuery()
  other.beginQuery(other.ANY_SAMPLES_PASSED, otherQuery)
  other.endQuery(other.ANY_SAMPLES_PASSED)

  t.equal(gl.getQuery(gl.ANY_SAMPLES_PASSED, gl.QUERY_RESULT), null, 'getQuery returns null for a parameter other than CURRENT_QUERY')
  t.equal(gl.getError(), gl.INVALID_ENUM, 'and sets INVALID_ENUM')
  t.equal(gl.getQuery(gl.TEXTURE_2D, gl.CURRENT_QUERY), null, 'and null for a target that isn\'t a query target')
  t.equal(gl.getError(), gl.INVALID_ENUM, 'and sets INVALID_ENUM')

  t.equal(gl.getQueryParameter(query, gl.QUERY_RESULT), null, 'getQueryParameter returns null for a query that hasn\'t begun')
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'and sets INVALID_OPERATION')
  gl.beginQuery(gl.ANY_SAMPLES_PASSED, query)
  t.equal(gl.getQueryParameter(query, gl.QUERY_RESULT), null, 'and for an active query')
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'and sets INVALID_OPERATION')
  gl.endQuery(gl.ANY_SAMPLES_PASSED)
  gl.beginQuery(gl.TRANSFORM_FEEDBACK_PRIMITIVES_WRITTEN, query)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'beginQuery sets INVALID_OPERATION for a query begun with another target')

  t.equal(gl.isQuery(null), false, 'isQuery returns false for null')
  t.equal(gl.isQuery(otherQuery), false, 'and for another context\'s query')
  gl.deleteQuery(otherQuery)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'deleteQuery sets INVALID_OPERATION for another context\'s query')
  t.equal(other.isQuery(otherQuery), true, 'and leaves it')
  gl.beginQuery(gl.ANY_SAMPLES_PASSED, otherQuery)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'beginQuery sets INVALID_OPERATION for another context\'s query')
  t.equal(gl.getQueryParameter(otherQuery, gl.QUERY_RESULT), null, 'getQueryParameter returns null for another context\'s query')
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'and sets INVALID_OPERATION')

  // The query is 1, so these would take the GL id of a query if they took numbers.
  t.throws(() => gl.isQuery(1), TypeError, 'isQuery throws a TypeError for a number')
  t.throws(() => gl.deleteQuery(1), TypeError, 'and so does deleteQuery')
  t.throws(() => gl.beginQuery(gl.ANY_SAMPLES_PASSED, 1), TypeError, 'and beginQuery')
  t.throws(() => gl.getQueryParameter(1, gl.QUERY_RESULT), TypeError, 'and getQueryParameter')
  t.throws(() => gl.beginQuery(gl.ANY_SAMPLES_PASSED, null), TypeError, 'beginQuery throws a TypeError for null')
  t.throws(() => gl.getQueryParameter(null, gl.QUERY_RESULT), TypeError, 'and so does getQueryParameter')
  t.equal(gl.getError(), gl.NO_ERROR, 'without setting an error')

  other.getExtension('STACKGL_destroy_context').destroy()
  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
