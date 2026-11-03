'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawPixel = require('./util/draw-pixel')

const COMPRESSED_RGB_S3TC_DXT1_EXT = 0x83F0

for (const webgl2 of [false, true]) {
  tape(`compressed textures: WebGL${webgl2 ? 2 : 1} without a compressed texture extension`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())

    const formats = gl.getParameter(gl.COMPRESSED_TEXTURE_FORMATS)
    t.ok(formats instanceof Uint32Array, 'COMPRESSED_TEXTURE_FORMATS is a Uint32Array')
    t.equal(formats.length, 0, 'with no formats')

    gl.compressedTexImage2D(gl.TEXTURE_2D, 0, COMPRESSED_RGB_S3TC_DXT1_EXT, 4, 4, 0, new Uint8Array(8))
    t.equal(gl.getError(), gl.INVALID_ENUM, 'compressedTexImage2D sets INVALID_ENUM for a format that isn\'t enabled')
    gl.compressedTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 4, 4, COMPRESSED_RGB_S3TC_DXT1_EXT, new Uint8Array(8))
    t.notEqual(gl.getError(), gl.NO_ERROR, 'and compressedTexSubImage2D sets an error')

    t.throws(() => gl.compressedTexImage2D(gl.TEXTURE_2D, 0, COMPRESSED_RGB_S3TC_DXT1_EXT, 4, 4, 0, null), TypeError, 'compressedTexImage2D throws a TypeError without data')
    t.throws(() => gl.compressedTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 4, 4, COMPRESSED_RGB_S3TC_DXT1_EXT, [0]), TypeError, 'and compressedTexSubImage2D for an array')

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}

// Draws the bound texture's color.
function sample (gl) {
  return drawPixel(gl, `precision mediump float;
uniform sampler2D sampler;
void main() {
  gl_FragColor = texture2D(sampler, vec2(0.5));
}`)
}

function createTexture (gl) {
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
}

// 4x4 blocks of one color. A DXT1 block is two RGB565 colors and a 2-bit index per pixel, which picks the first color here.
const DXT1_RED = [0x00, 0xF8, 0x00, 0x00, 0, 0, 0, 0]
const DXT1_BLUE = [0x1F, 0x00, 0x00, 0x00, 0, 0, 0, 0]
// With the first color no greater than the second, index 3 is transparent black in RGBA DXT1.
const DXT1_TRANSPARENT = [0x00, 0x00, 0x00, 0xF8, 0xFF, 0xFF, 0xFF, 0xFF]
// DXT3 adds 4 bits of alpha per pixel before the colors, here 8 of 15.
const DXT3_RED = [0x88, 0x88, 0x88, 0x88, 0x88, 0x88, 0x88, 0x88, ...DXT1_RED]
// DXT5 adds two alpha values and a 3-bit index per pixel, which picks the first, 102.
const DXT5_RED = [102, 0, 0, 0, 0, 0, 0, 0, ...DXT1_RED]

for (const webgl2 of [false, true]) {
  tape(`compressed textures: WebGL${webgl2 ? 2 : 1} WEBGL_compressed_texture_s3tc`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })
    const ext = gl.getExtension('WEBGL_compressed_texture_s3tc')
    t.ok(ext, 'is available')
    t.deepEqual([...gl.getParameter(gl.COMPRESSED_TEXTURE_FORMATS)].sort(), [0x83F0, 0x83F1, 0x83F2, 0x83F3], 'COMPRESSED_TEXTURE_FORMATS lists its formats')

    const cases = [
      ['COMPRESSED_RGB_S3TC_DXT1_EXT', DXT1_RED, [255, 0, 0, 255]],
      ['COMPRESSED_RGBA_S3TC_DXT1_EXT', DXT1_TRANSPARENT, [0, 0, 0, 0]],
      ['COMPRESSED_RGBA_S3TC_DXT3_EXT', DXT3_RED, [255, 0, 0, 136]],
      ['COMPRESSED_RGBA_S3TC_DXT5_EXT', DXT5_RED, [255, 0, 0, 102]]
    ]
    for (const [format, block, expected] of cases) {
      createTexture(gl)
      gl.compressedTexImage2D(gl.TEXTURE_2D, 0, ext[format], 4, 4, 0, new Uint8Array(block))
      t.deepEqual(sample(gl), expected, format)
    }

    createTexture(gl)
    gl.compressedTexImage2D(gl.TEXTURE_2D, 0, ext.COMPRESSED_RGB_S3TC_DXT1_EXT, 4, 4, 0, new Uint8Array(DXT1_RED))
    gl.compressedTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 4, 4, ext.COMPRESSED_RGB_S3TC_DXT1_EXT, new Uint8Array(DXT1_BLUE))
    t.deepEqual(sample(gl), [0, 0, 255, 255], 'compressedTexSubImage2D replaces a block')
    t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

    gl.compressedTexImage2D(gl.TEXTURE_2D, 0, ext.COMPRESSED_RGB_S3TC_DXT1_EXT, 4, 4, 0, new Uint8Array(7))
    t.equal(gl.getError(), gl.INVALID_VALUE, 'data of the wrong size sets INVALID_VALUE')
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.compressedTexImage2D(gl.TEXTURE_2D, 0, ext.COMPRESSED_RGB_S3TC_DXT1_EXT, 4, 4, 0, new Uint8Array(DXT1_RED))
    t.equal(gl.getError(), gl.INVALID_OPERATION, 'no texture bound sets INVALID_OPERATION')

    if (webgl2) {
      createTexture(gl)
      // A block to skip, then the block to upload.
      gl.compressedTexImage2D(gl.TEXTURE_2D, 0, ext.COMPRESSED_RGB_S3TC_DXT1_EXT, 4, 4, 0, new Uint8Array([...DXT1_RED, ...DXT1_BLUE, 9]), 8, 8)
      t.deepEqual(sample(gl), [0, 0, 255, 255], 'compressedTexImage2D reads srcLengthOverride bytes from srcOffset')
      t.equal(gl.getError(), gl.NO_ERROR, 'and sets no error')
    }

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}

for (const webgl2 of [false, true]) {
  tape(`compressed textures: WebGL${webgl2 ? 2 : 1} WEBGL_compressed_texture_s3tc_srgb`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })
    const ext = gl.getExtension('WEBGL_compressed_texture_s3tc_srgb')
    t.ok(ext, 'is available')
    t.deepEqual([...gl.getParameter(gl.COMPRESSED_TEXTURE_FORMATS)].sort(), [0x8C4C, 0x8C4D, 0x8C4E, 0x8C4F], 'COMPRESSED_TEXTURE_FORMATS lists its formats')

    // RGB565 (16, 32, 16), about 130 of 255 in each channel, which sampling turns from sRGB into about 57 to 59 in linear terms.
    const gray = [0x10, 0x84, 0x00, 0x00, 0, 0, 0, 0]
    createTexture(gl)
    gl.compressedTexImage2D(gl.TEXTURE_2D, 0, ext.COMPRESSED_SRGB_S3TC_DXT1_EXT, 4, 4, 0, new Uint8Array(gray))
    const [r, g, b, a] = sample(gl)
    t.ok([r, g, b].every(value => Math.abs(value - 58) <= 3) && a === 255, `COMPRESSED_SRGB_S3TC_DXT1_EXT is decoded from sRGB (got ${[r, g, b, a]})`)

    const formats = [
      ['COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT', DXT1_RED],
      ['COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT', DXT3_RED],
      ['COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT', DXT5_RED]
    ]
    for (const [format, block] of formats) {
      createTexture(gl)
      gl.compressedTexImage2D(gl.TEXTURE_2D, 0, ext[format], 4, 4, 0, new Uint8Array(block))
    }
    t.equal(gl.getError(), gl.NO_ERROR, 'the alpha formats take uploads too')

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}

// An RGTC block is two values of one channel and a 3-bit index per pixel, which picks the first value here. Signed blocks hold signed bytes.
function rgtcBlock (value) {
  return [value & 0xFF, 0, 0, 0, 0, 0, 0, 0]
}

for (const webgl2 of [false, true]) {
  tape(`compressed textures: WebGL${webgl2 ? 2 : 1} EXT_texture_compression_rgtc`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })
    const ext = gl.getExtension('EXT_texture_compression_rgtc')
    t.ok(ext, 'is available')
    t.deepEqual([...gl.getParameter(gl.COMPRESSED_TEXTURE_FORMATS)].sort(), [0x8DBB, 0x8DBC, 0x8DBD, 0x8DBE], 'COMPRESSED_TEXTURE_FORMATS lists its formats')

    // Signed values below 0 are clamped to 0 when drawn to the drawing buffer.
    const cases = [
      ['COMPRESSED_RED_RGTC1_EXT', rgtcBlock(102), [102, 0, 0, 255]],
      ['COMPRESSED_SIGNED_RED_RGTC1_EXT', rgtcBlock(127), [255, 0, 0, 255]],
      ['COMPRESSED_RED_GREEN_RGTC2_EXT', [...rgtcBlock(102), ...rgtcBlock(204)], [102, 204, 0, 255]],
      ['COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT', [...rgtcBlock(127), ...rgtcBlock(-127)], [255, 0, 0, 255]]
    ]
    for (const [format, block, expected] of cases) {
      createTexture(gl)
      gl.compressedTexImage2D(gl.TEXTURE_2D, 0, ext[format], 4, 4, 0, new Uint8Array(block))
      t.deepEqual(sample(gl), expected, format)
    }
    t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}
