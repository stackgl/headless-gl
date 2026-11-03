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
// The pixel unpack buffer stays bound, since drawing doesn't use it.
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

function createUnpackBuffer (gl) {
  gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, gl.createBuffer())
  // A pixel to skip, then an orange and a blue pixel.
  gl.bufferData(gl.PIXEL_UNPACK_BUFFER, new Uint8Array([9, 9, 9, 9, 255, 102, 0, 255, 0, 0, 255, 255]), gl.STATIC_DRAW)
}

tape('unpack buffer: texture uploads from an offset into the pixel unpack buffer', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  createUnpackBuffer(gl)

  createTexture(gl, gl.TEXTURE_2D)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, 4)
  t.deepEqual(sample(gl, 'sampler2D'), [255, 102, 0, 255], 'texImage2D')
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, 8)
  t.deepEqual(sample(gl, 'sampler2D'), [0, 0, 255, 255], 'texSubImage2D')

  createTexture(gl, gl.TEXTURE_3D)
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, 4)
  t.deepEqual(sample(gl, 'sampler3D'), [255, 102, 0, 255], 'texImage3D')
  gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, 8)
  t.deepEqual(sample(gl, 'sampler3D'), [0, 0, 255, 255], 'texSubImage3D')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('unpack buffer: texture uploads that don\'t match the pixel unpack buffer binding', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  createTexture(gl, gl.TEXTURE_2D)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, 0)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'an offset without a pixel unpack buffer sets INVALID_OPERATION')

  createUnpackBuffer(gl)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'an array with a pixel unpack buffer bound sets INVALID_OPERATION')
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'and so does null')
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, { width: 1, height: 1, data: new Uint8ClampedArray(4) })
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'and so does an image')
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'texSubImage2D with an array sets INVALID_OPERATION')
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'texImage3D with an array sets INVALID_OPERATION')
  gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, null)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'texSubImage3D with null sets INVALID_OPERATION')

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, -1)
  t.equal(gl.getError(), gl.INVALID_VALUE, 'a negative offset sets INVALID_VALUE')
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, 12)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'pixels past the end of the buffer set INVALID_OPERATION')

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, 4)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'UNPACK_FLIP_Y_WEBGL sets INVALID_OPERATION')
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
  gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, 4)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'and so does UNPACK_PREMULTIPLY_ALPHA_WEBGL')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
