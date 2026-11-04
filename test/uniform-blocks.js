'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawTriangle = require('./util/draw-triangle')
const makeProgram = require('./util/make-program')

const VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`

// A std140 block, so its offsets and strides are fixed, and a uniform outside it.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
layout(std140) uniform Colors {
  vec4 base;
  float weights[3];
  mat2 transform;
};
uniform float scale;
out vec4 color;
void main() {
  color = (base + vec4(weights[2], 0.0, 0.0, 0.0) + vec4(0.0, transform[1], 0.0)) * scale;
}`

function createProgram (gl) {
  const program = makeProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program))
  }
  return program
}

tape('uniform blocks: drawing with a uniform buffer', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const program = createProgram(gl)
  gl.useProgram(program)
  gl.uniform1f(gl.getUniformLocation(program, 'scale'), 1)

  // std140 puts each float of an array, and each column of a matrix, 16 bytes apart.
  const data = new Float32Array(24)
  data.set([0, 0, 0, 1], 0)
  data[12] = 0.2
  data.set([0.4, 0.6], 20)
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.UNIFORM_BUFFER, buffer)
  gl.bufferData(gl.UNIFORM_BUFFER, data, gl.STATIC_DRAW)
  gl.bindBufferBase(gl.UNIFORM_BUFFER, 1, buffer)
  gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'Colors'), 1)

  drawTriangle(gl)
  const pixel = new Uint8Array(4)
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
  t.deepEqual([...pixel], [51, 102, 153, 255], 'the block reads the buffer bound to its binding')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('uniform blocks: getProgramParameter counts the active uniform blocks', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const program = createProgram(gl)

  t.equal(gl.getProgramParameter(program, gl.ACTIVE_UNIFORM_BLOCKS), 1, 'ACTIVE_UNIFORM_BLOCKS is 1')
  t.equal(gl.getError(), gl.NO_ERROR, 'and sets no error')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('uniform blocks: getActiveUniformBlockName', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const program = createProgram(gl)

  t.equal(gl.getActiveUniformBlockName(program, 0), 'Colors', 'returns the block\'s name')
  t.equal(gl.getError(), gl.NO_ERROR, 'and sets no error')
  t.equal(gl.getActiveUniformBlockName(program, 1), null, 'returns null for an index past the last block')
  t.equal(gl.getError(), gl.INVALID_VALUE, 'and sets INVALID_VALUE')
  t.equal(gl.getActiveUniformBlockName(null, 0), null, 'returns null for a null program')
  t.equal(gl.getError(), gl.INVALID_VALUE, 'and sets INVALID_VALUE')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('uniform blocks: getUniformIndices', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const program = createProgram(gl)

  const names = ['base', 'weights[0]', 'transform', 'scale', 'missing']
  const indices = gl.getUniformIndices(program, names)
  t.equal(indices.length, names.length, 'returns an index for each name')
  for (let i = 0; i < 4; i++) {
    t.equal(gl.getActiveUniform(program, indices[i]).name, names[i], `whose active uniform is ${names[i]}`)
  }
  t.equal(indices[4], gl.INVALID_INDEX, 'and INVALID_INDEX for a name that isn\'t an active uniform')
  t.deepEqual(gl.getUniformIndices(program, new Set(['scale'])), [indices[3]], 'takes any iterable of names')
  t.equal(gl.getError(), gl.NO_ERROR, 'and sets no error')

  t.equal(gl.getUniformIndices(null, names), null, 'returns null for a null program')
  t.equal(gl.getError(), gl.INVALID_VALUE, 'and sets INVALID_VALUE')
  t.throws(() => gl.getUniformIndices(program, 'base'), TypeError, 'throws a TypeError for a string instead of a sequence')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('uniform blocks: getActiveUniforms', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const program = createProgram(gl)
  const indices = gl.getUniformIndices(program, ['base', 'weights[0]', 'transform', 'scale'])

  // Uniforms outside a block have no block index, offset or strides, so GL gives -1 for them.
  const expected = [
    ['UNIFORM_TYPE', [gl.FLOAT_VEC4, gl.FLOAT, gl.FLOAT_MAT2, gl.FLOAT]],
    ['UNIFORM_SIZE', [1, 3, 1, 1]],
    ['UNIFORM_BLOCK_INDEX', [0, 0, 0, -1]],
    ['UNIFORM_OFFSET', [0, 16, 64, -1]],
    ['UNIFORM_ARRAY_STRIDE', [0, 16, 0, -1]],
    ['UNIFORM_MATRIX_STRIDE', [0, 0, 16, -1]],
    ['UNIFORM_IS_ROW_MAJOR', [false, false, false, false]]
  ]
  for (const [pname, values] of expected) {
    t.deepEqual(gl.getActiveUniforms(program, indices, gl[pname]), values, pname)
  }
  t.deepEqual(gl.getActiveUniforms(program, [], gl.UNIFORM_TYPE), [], 'no indices give no values')
  t.equal(gl.getError(), gl.NO_ERROR, 'and sets no error')

  t.equal(gl.getActiveUniforms(program, indices, gl.UNIFORM_NAME_LENGTH), null, 'returns null for UNIFORM_NAME_LENGTH, which WebGL leaves out')
  t.equal(gl.getError(), gl.INVALID_ENUM, 'and sets INVALID_ENUM')
  t.equal(gl.getActiveUniforms(program, [0, 99], gl.UNIFORM_TYPE), null, 'returns null for an index past the last uniform')
  t.equal(gl.getError(), gl.INVALID_VALUE, 'and sets INVALID_VALUE')
  t.equal(gl.getActiveUniforms(null, indices, gl.UNIFORM_TYPE), null, 'returns null for a null program')
  t.equal(gl.getError(), gl.INVALID_VALUE, 'and sets INVALID_VALUE')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('uniform blocks: getActiveUniformBlockParameter', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const program = createProgram(gl)
  const block = gl.getUniformBlockIndex(program, 'Colors')

  t.equal(gl.getActiveUniformBlockParameter(program, block, gl.UNIFORM_BLOCK_BINDING), 0, 'UNIFORM_BLOCK_BINDING starts at 0')
  gl.uniformBlockBinding(program, block, 2)
  t.equal(gl.getActiveUniformBlockParameter(program, block, gl.UNIFORM_BLOCK_BINDING), 2, 'and follows uniformBlockBinding')
  t.equal(gl.getActiveUniformBlockParameter(program, block, gl.UNIFORM_BLOCK_DATA_SIZE), 96, 'UNIFORM_BLOCK_DATA_SIZE')
  t.equal(gl.getActiveUniformBlockParameter(program, block, gl.UNIFORM_BLOCK_ACTIVE_UNIFORMS), 3, 'UNIFORM_BLOCK_ACTIVE_UNIFORMS')
  const indices = gl.getActiveUniformBlockParameter(program, block, gl.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES)
  t.ok(indices instanceof Uint32Array, 'UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES is a Uint32Array')
  t.deepEqual([...indices].sort(), gl.getUniformIndices(program, ['base', 'weights[0]', 'transform']).sort(), 'of the indices of the block\'s uniforms')
  t.equal(gl.getActiveUniformBlockParameter(program, block, gl.UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER), false, 'UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER')
  t.equal(gl.getActiveUniformBlockParameter(program, block, gl.UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER), true, 'UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  t.equal(gl.getActiveUniformBlockParameter(program, block, gl.UNIFORM_BLOCK_NAME_LENGTH), null, 'returns null for UNIFORM_BLOCK_NAME_LENGTH, which WebGL leaves out')
  t.equal(gl.getError(), gl.INVALID_ENUM, 'and sets INVALID_ENUM')
  t.equal(gl.getActiveUniformBlockParameter(program, 1, gl.UNIFORM_BLOCK_DATA_SIZE), null, 'returns null for an index past the last block')
  t.equal(gl.getError(), gl.INVALID_VALUE, 'and sets INVALID_VALUE')
  t.equal(gl.getActiveUniformBlockParameter(null, block, gl.UNIFORM_BLOCK_DATA_SIZE), null, 'returns null for a null program')
  t.equal(gl.getError(), gl.INVALID_VALUE, 'and sets INVALID_VALUE')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
