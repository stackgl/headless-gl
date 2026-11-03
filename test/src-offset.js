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
