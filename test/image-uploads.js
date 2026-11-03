'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawPixel = require('./util/draw-pixel')

const HALF_FLOAT_OES = 0x8D61

// An image 1 pixel wide whose top row is the first color and bottom row the second.
function image (...colors) {
  return { width: 1, height: colors.length, data: new Uint8ClampedArray(colors.flat()) }
}

function createTexture (gl, target = gl.TEXTURE_2D) {
  gl.bindTexture(target, gl.createTexture())
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
}

// Draws the bound texture's color at the given t coordinate. The first row of the image is at t = 0.25 unless it's flipped.
function sample (gl, t = 0.5) {
  return drawPixel(gl, `precision mediump float;
uniform sampler2D sampler;
uniform float t;
void main() {
  gl_FragColor = texture2D(sampler, vec2(0.5, t));
}`, program => gl.uniform1f(gl.getUniformLocation(program, 't'), t))
}

// Draws the bound texture's color, as GLSL ES 3.00, divided by divisor so integer textures can be drawn.
function sample3 (gl, sampler = 'sampler2D', divisor = '1.0') {
  return drawPixel(gl, `#version 300 es
precision highp float;
precision highp usampler2D;
uniform ${sampler} sampler;
out vec4 color;
void main() {
  color = vec4(texture(sampler, vec2(0.5))) / ${divisor};
}`)
}

tape('image uploads: WebGL1 formats and types', function (t) {
  const gl = createContext(1, 1)
  gl.getExtension('OES_texture_float')
  gl.getExtension('OES_texture_half_float')
  const color = image([102, 51, 0, 204])

  const cases = [
    ['RGBA', 'UNSIGNED_BYTE', [102, 51, 0, 204]],
    // A row of 3 bytes isn't a multiple of the default UNPACK_ALIGNMENT, which images ignore.
    ['RGB', 'UNSIGNED_BYTE', [102, 51, 0, 255]],
    ['LUMINANCE', 'UNSIGNED_BYTE', [102, 102, 102, 255]],
    ['ALPHA', 'UNSIGNED_BYTE', [0, 0, 0, 204]],
    ['LUMINANCE_ALPHA', 'UNSIGNED_BYTE', [102, 102, 102, 204]],
    ['RGBA', 'UNSIGNED_SHORT_4_4_4_4', [102, 51, 0, 204]],
    // 5 bits of 102 and 51 are 12 and 6 of 31.
    ['RGBA', 'UNSIGNED_SHORT_5_5_5_1', [99, 49, 0, 255]],
    // 6 bits of 51 are 12 of 63, which Apple's driver reads as 49 of 255 and Mesa's as 48, so green is 85, whose 6 bits are 21 of 63, which both read as 85.
    ['RGB', 'UNSIGNED_SHORT_5_6_5', [99, 85, 0, 255], image([102, 85, 0, 204])],
    ['RGBA', 'FLOAT', [102, 51, 0, 204]],
    ['LUMINANCE_ALPHA', 'FLOAT', [102, 102, 102, 204]],
    ['RGBA', 'HALF_FLOAT_OES', [102, 51, 0, 204]]
  ]
  for (const [format, type, expected, source = color] of cases) {
    createTexture(gl)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl[format], gl[format], type === 'HALF_FLOAT_OES' ? HALF_FLOAT_OES : gl[type], source)
    t.equal(gl.getError(), gl.NO_ERROR, `${format} ${type} texImage2D has no GL error`)
    t.deepEqual(sample(gl), expected, `${format} ${type}`)
  }

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('image uploads: WebGL2 formats and types', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const color = image([102, 51, 0, 204])

  const cases = [
    ['R8', 'RED', 'UNSIGNED_BYTE', [102, 0, 0, 255]],
    ['RG8', 'RG', 'UNSIGNED_BYTE', [102, 51, 0, 255]],
    ['R16F', 'RED', 'HALF_FLOAT', [102, 0, 0, 255]],
    ['RGBA32F', 'RGBA', 'FLOAT', [102, 51, 0, 204]],
    // 2 bits of alpha 0.8 is 2 of 3.
    ['RGB10_A2', 'RGBA', 'UNSIGNED_INT_2_10_10_10_REV', [102, 51, 0, 170]],
    ['R11F_G11F_B10F', 'RGB', 'UNSIGNED_INT_10F_11F_11F_REV', [102, 51, 0, 255]]
  ]
  for (const [internalFormat, format, type, expected] of cases) {
    createTexture(gl)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl[internalFormat], gl[format], gl[type], color)
    t.equal(gl.getError(), gl.NO_ERROR, `${internalFormat} texImage2D has no GL error`)
    t.deepEqual(sample3(gl), expected, internalFormat)
  }

  // 240 of 255 is just closer to the 11-bit float 239.06 than to 241.06, and 241 to the 10-bit float 239.06 than to 243.05.
  createTexture(gl)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R11F_G11F_B10F, gl.RGB, gl.UNSIGNED_INT_10F_11F_11F_REV, image([240, 240, 241, 255]))
  t.deepEqual(sample3(gl), [239, 239, 239, 255], 'R11F_G11F_B10F rounds to the nearest float')

  createTexture(gl)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8UI, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, color)
  t.deepEqual(sample3(gl, 'usampler2D', '255.0'), [102, 51, 0, 204], 'RGBA8UI keeps the values')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('image uploads: UNPACK_FLIP_Y_WEBGL and UNPACK_PREMULTIPLY_ALPHA_WEBGL', function (t) {
  const gl = createContext(1, 1)
  gl.getExtension('OES_texture_float')
  createTexture(gl)

  const rows = image([255, 0, 0, 255], [0, 255, 0, 255])
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, rows)
  t.deepEqual(sample(gl, 0.25), [255, 0, 0, 255], 'the first row is at t = 0.25 without flipping')
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, rows)
  t.deepEqual(sample(gl, 0.25), [0, 255, 0, 255], 'and the second row with flipping')
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, rows)
  t.deepEqual(sample(gl, 0.25), [0, 255, 0, 255], 'RGB rows are flipped too')
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)

  // Alpha 128 halves the color, even for formats without alpha.
  const translucent = image([255, 102, 0, 128])
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, translucent)
  t.deepEqual(sample(gl), [128, 51, 0, 128], 'RGBA UNSIGNED_BYTE is premultiplied')
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, translucent)
  t.deepEqual(sample(gl), [128, 51, 0, 255], 'RGB UNSIGNED_BYTE is premultiplied before alpha is dropped')
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.FLOAT, translucent)
  t.deepEqual(sample(gl), [128, 51, 0, 128], 'RGBA FLOAT is premultiplied')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('image uploads: texSubImage2D, texSubImage3D and canvases', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const color = image([102, 51, 0, 204])

  createTexture(gl)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, null)
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGB, gl.UNSIGNED_BYTE, color)
  t.deepEqual(sample3(gl), [102, 51, 0, 255], 'texSubImage2D')

  // An object with a 2D context, like a node-canvas Canvas.
  const canvas = { width: 1, height: 1, getContext: () => ({ getImageData: () => color }) }
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, gl.RG, gl.UNSIGNED_BYTE, canvas)
  t.deepEqual(sample3(gl), [102, 51, 0, 255], 'texImage2D with a canvas')

  createTexture(gl, gl.TEXTURE_3D)
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA16F, 1, 1, 1, 0, gl.RGBA, gl.HALF_FLOAT, null)
  gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, 1, 1, 1, gl.RGBA, gl.HALF_FLOAT, color)
  t.deepEqual(drawPixel(gl, `#version 300 es
precision highp float;
precision highp sampler3D;
uniform sampler3D sampler;
out vec4 color;
void main() {
  color = texture(sampler, vec3(0.5));
}`), [102, 51, 0, 204], 'texSubImage3D')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('image uploads: unpack parameters', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  createTexture(gl)

  // Images ignore these, and keep them for later uploads.
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 8)
  gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 5)
  gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 1)
  gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 1)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE, image([102, 51, 0, 204]))
  t.equal(gl.getError(), gl.NO_ERROR, 'texImage2D has no GL error')
  t.deepEqual(sample3(gl), [102, 51, 0, 255], 'the image is uploaded')
  t.equal(gl.getParameter(gl.UNPACK_ALIGNMENT), 8, 'UNPACK_ALIGNMENT is kept')
  t.equal(gl.getParameter(gl.UNPACK_ROW_LENGTH), 5, 'UNPACK_ROW_LENGTH is kept')
  t.equal(gl.getParameter(gl.UNPACK_SKIP_PIXELS), 1, 'UNPACK_SKIP_PIXELS is kept')
  t.equal(gl.getParameter(gl.UNPACK_SKIP_ROWS), 1, 'UNPACK_SKIP_ROWS is kept')
  t.equal(gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL), true, 'UNPACK_FLIP_Y_WEBGL is kept')

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_SHORT, image([0, 0, 0, 0]))
  t.equal(gl.getError(), gl.INVALID_ENUM, 'a type images can\'t be uploaded as sets INVALID_ENUM')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
