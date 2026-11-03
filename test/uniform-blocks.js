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
