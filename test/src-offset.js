'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawPixel = require('./util/draw-pixel')

function createTexture (gl, target) {
  gl.bindTexture(target, gl.createTexture())
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
}

// Draws the color of the bound texture of the given sampler type.
function sample (gl, sampler) {
  return drawPixel(gl, `#version 300 es
precision mediump float;
precision mediump sampler3D;
uniform ${sampler} sampler;
out vec4 color;
void main() {
  color = texture(sampler, ${sampler === 'sampler3D' ? 'vec3(0.5)' : 'vec2(0.5)'});
}`)
}

tape('srcOffset: texture uploads start srcOffset elements into the data', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  // A pixel to skip, then the pixel to upload.
  const bytes = new Uint8Array([9, 9, 9, 9, 255, 102, 0, 255])

  createTexture(gl, gl.TEXTURE_2D)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes, 4)
  t.deepEqual(sample(gl, 'sampler2D'), [255, 102, 0, 255], 'texImage2D')

  // srcOffset counts elements, which are 4 bytes in a Float32Array.
  createTexture(gl, gl.TEXTURE_2D)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 1, 1, 0, gl.RGBA, gl.FLOAT, null)
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 1, gl.RGBA, gl.FLOAT, new Float32Array([0, 0, 0, 0, 1, 0.4, 0, 1]), 4)
  t.deepEqual(sample(gl, 'sampler2D'), [255, 102, 0, 255], 'texSubImage2D with a Float32Array')

  createTexture(gl, gl.TEXTURE_3D)
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes, 4)
  t.deepEqual(sample(gl, 'sampler3D'), [255, 102, 0, 255], 'texImage3D')

  // A DataView's elements are bytes.
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new DataView(bytes.buffer), 4)
  t.deepEqual(sample(gl, 'sampler3D'), [255, 102, 0, 255], 'texSubImage3D with a DataView')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('srcOffset: texture uploads without enough data after srcOffset', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const bytes = new Uint8Array(8)

  createTexture(gl, gl.TEXTURE_2D)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes, 6)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'texImage2D sets INVALID_OPERATION with 2 bytes left')
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes, 8)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'and with none left')
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes, 9)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'and with srcOffset past the end')
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bytes, 9)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'texSubImage2D sets INVALID_OPERATION with srcOffset past the end')

  createTexture(gl, gl.TEXTURE_3D)
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes, 8)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'texImage3D sets INVALID_OPERATION with none left')
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bytes, 9)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'texSubImage3D sets INVALID_OPERATION with srcOffset past the end')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

// Draws with the first 4 floats of the buffer as the color of every vertex.
function drawBufferColor (gl, buffer) {
  return drawPixel(gl, `#version 300 es
precision mediump float;
in vec4 vertexColor;
out vec4 color;
void main() {
  color = vertexColor;
}`, () => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(1, 1)
  }, `#version 300 es
layout(location = 0) in vec2 position;
layout(location = 1) in vec4 color;
out vec4 vertexColor;
void main() {
  vertexColor = color;
  gl_Position = vec4(position, 0.0, 1.0);
}`)
}

tape('srcOffset: bufferData and bufferSubData copy length elements from srcOffset', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([9, 9, 1, 0.4, 0, 1, 9]), gl.STATIC_DRAW, 2, 4)
  t.equal(gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE), 16, 'bufferData sizes the buffer to length elements')
  t.deepEqual(drawBufferColor(gl, buffer), [255, 102, 0, 255], 'and copies them from srcOffset')

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([9, 0, 1, 0, 1]), gl.STATIC_DRAW, 1)
  t.equal(gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE), 16, 'bufferData without a length takes every element from srcOffset')
  t.deepEqual(drawBufferColor(gl, buffer), [0, 255, 0, 255], 'and copies them')

  // A DataView's elements are bytes.
  const floats = new Float32Array([9, 1, 0.4, 0, 1])
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, new DataView(floats.buffer), 4, 16)
  t.deepEqual(drawBufferColor(gl, buffer), [255, 102, 0, 255], 'bufferSubData copies length elements from srcOffset')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, floats, gl.STATIC_DRAW, 6)
  t.equal(gl.getError(), gl.INVALID_VALUE, 'bufferData sets INVALID_VALUE with srcOffset past the end')
  gl.bufferData(gl.ARRAY_BUFFER, floats, gl.STATIC_DRAW, 2, 4)
  t.equal(gl.getError(), gl.INVALID_VALUE, 'and with length past the end')
  t.equal(gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE), 16, 'which leaves the buffer as it was')
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, floats, 2, 4)
  t.equal(gl.getError(), gl.INVALID_VALUE, 'bufferSubData sets INVALID_VALUE with length past the end')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

// Draws with the uniform u, which setUniform sets, as the color.
function drawUniform (gl, declaration, color, setUniform) {
  return drawPixel(gl, `#version 300 es
precision mediump float;
uniform ${declaration} u;
out vec4 color;
void main() {
  color = ${color};
}`, program => setUniform(gl.getUniformLocation(program, 'u')))
}

tape('srcOffset: uniform methods take srcLength elements from srcOffset', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const orange = [255, 102, 0, 255]

  t.deepEqual(drawUniform(gl, 'vec4', 'u', location => gl.uniform4fv(location, new Float32Array([0, 0, 0, 0, 1, 0.4, 0, 1]), 4)), orange, 'uniform4fv with srcOffset')
  t.deepEqual(drawUniform(gl, 'vec4', 'u', location => gl.uniform4fv(location, [9, 1, 0.4, 0, 1, 9], 1, 4)), orange, 'uniform4fv with an array, srcOffset and srcLength')
  t.deepEqual(drawUniform(gl, 'uvec4', 'vec4(u) / 255.0', location => gl.uniform4uiv(location, new Uint32Array([0, 255, 102, 0, 255]), 1)), orange, 'uniform4uiv with srcOffset')
  t.deepEqual(drawUniform(gl, 'mat2', 'vec4(u[0], u[1])', location => gl.uniformMatrix2fv(location, false, new Float32Array([9, 1, 0.4, 0, 1]), 1)), orange, 'uniformMatrix2fv with srcOffset')
  t.deepEqual(drawUniform(gl, 'mat2x4', 'u[1]', location => gl.uniformMatrix2x4fv(location, false, new Float32Array([9, 0, 0, 0, 0, 1, 0.4, 0, 1, 9]), 1, 8)), orange, 'uniformMatrix2x4fv with srcOffset and srcLength')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  drawUniform(gl, 'vec4', 'u', location => gl.uniform4fv(location, new Float32Array(8), 9))
  t.equal(gl.getError(), gl.INVALID_VALUE, 'uniform4fv sets INVALID_VALUE with srcOffset past the end')
  drawUniform(gl, 'vec4', 'u', location => gl.uniform4fv(location, new Float32Array(8), 4, 8))
  t.equal(gl.getError(), gl.INVALID_VALUE, 'and with srcLength past the end')
  drawUniform(gl, 'uvec4', 'vec4(u)', location => gl.uniform4uiv(location, new Uint32Array(8), 4, 8))
  t.equal(gl.getError(), gl.INVALID_VALUE, 'uniform4uiv sets INVALID_VALUE with srcLength past the end')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
