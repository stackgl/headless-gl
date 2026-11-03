'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawPixel = require('./util/draw-pixel')

// Draws the bound texture's color at t = 0.25, the first row of a texture 2 pixels high, divided by divisor.
function sampleFirstRow (gl, sampler, divisor) {
  return drawPixel(gl, `#version 300 es
precision highp float;
precision highp usampler2D;
uniform ${sampler} sampler;
out vec4 color;
void main() {
  color = vec4(texture(sampler, vec2(0.5, 0.25))) / ${divisor};
}`)
}

function createTexture (gl) {
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
}

tape('UNPACK_FLIP_Y_WEBGL: WebGL2 formats and types', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

  // Each texture is 1 pixel wide and 2 high, and its second row, which flipping puts first, is (1, 0.4, 0, 1) or as much of it as the format has.
  const cases = [
    ['R8', gl.RED, gl.UNSIGNED_BYTE, new Uint8Array([51, 255]), 'sampler2D', '1.0', [255, 0, 0, 255]],
    ['RG8', gl.RG, gl.UNSIGNED_BYTE, new Uint8Array([51, 0, 255, 102]), 'sampler2D', '1.0', [255, 102, 0, 255]],
    ['R32F', gl.RED, gl.FLOAT, new Float32Array([0.2, 1]), 'sampler2D', '1.0', [255, 0, 0, 255]],
    // 0.2, 0, 0 and 1, then 1, 0.4, 0 and 1, as half floats.
    ['RGBA16F', gl.RGBA, gl.HALF_FLOAT, new Uint16Array([0x3266, 0, 0, 0x3C00, 0x3C00, 0x3666, 0, 0x3C00]), 'sampler2D', '1.0', [255, 102, 0, 255]],
    ['RGBA8UI', gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, new Uint8Array([1, 2, 3, 4, 255, 102, 0, 255]), 'usampler2D', '255.0', [255, 102, 0, 255]],
    // Green, then red, each with alpha 3.
    ['RGB10_A2', gl.RGBA, gl.UNSIGNED_INT_2_10_10_10_REV, new Uint32Array([0xC00FFC00, 0xC00003FF]), 'sampler2D', '1.0', [255, 0, 0, 255]]
  ]
  for (const [internalFormat, format, type, data, sampler, divisor, expected] of cases) {
    createTexture(gl)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl[internalFormat], 1, 2, 0, format, type, data)
    t.equal(gl.getError(), gl.NO_ERROR, `${internalFormat} texImage2D has no GL error`)
    t.deepEqual(sampleFirstRow(gl, sampler, divisor), expected, `${internalFormat} rows are flipped`)
  }

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('UNPACK_FLIP_Y_WEBGL: WebGL2 UNPACK_ROW_LENGTH, UNPACK_SKIP_PIXELS and UNPACK_SKIP_ROWS', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  createTexture(gl)

  // Rows 2 pixels long, where the image is the second pixel of the second and third rows.
  const skipped = [9, 9, 9, 9]
  const data = new Uint8Array([
    ...skipped, ...skipped,
    ...skipped, 51, 0, 0, 255,
    ...skipped, 255, 102, 0, 255
  ])
  gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 2)
  gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 1)
  gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 1)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
  t.equal(gl.getError(), gl.NO_ERROR, 'texImage2D has no GL error')
  t.deepEqual(sampleFirstRow(gl, 'sampler2D', '1.0'), [255, 102, 0, 255], 'the rows of the image are flipped')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('UNPACK_FLIP_Y_WEBGL: WebGL1 rows padded to UNPACK_ALIGNMENT', function (t) {
  const gl = createContext(1, 1)
  createTexture(gl)

  // 3-byte rows padded to 4 bytes, except the last.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 2, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([51, 0, 0, 0, 255, 102, 0]))
  t.equal(gl.getError(), gl.NO_ERROR, 'texImage2D has no GL error')
  t.deepEqual(drawPixel(gl, `precision mediump float;
uniform sampler2D sampler;
void main() {
  gl_FragColor = texture2D(sampler, vec2(0.5, 0.25));
}`), [255, 102, 0, 255], 'the rows are flipped')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('UNPACK_FLIP_Y_WEBGL: data that is too short', function (t) {
  const gl = createContext(1, 1)
  createTexture(gl)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'texImage2D sets INVALID_OPERATION')
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 2, 2, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'texSubImage2D sets INVALID_OPERATION')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
