'use strict'

const tape = require('tape')
const createContext = require('../index')

const HALF_FLOAT_OES = 0x8D61

// Makes pixel data of a kind with room for any 1x1 upload or read, as a typed array or a DataView, whose elements are bytes.
function makeData (Kind) {
  return Kind === DataView ? new DataView(new ArrayBuffer(16)) : new Kind(16)
}

// The kinds of data that aren't any type's typed array, which are never allowed.
const NEVER_ALLOWED = [DataView, Float64Array, ...(globalThis.Float16Array ? [globalThis.Float16Array] : [])]

tape('pixel arrays: WebGL1 texture uploads take only the typed array of their type', function (t) {
  const gl = createContext(1, 1)
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, HALF_FLOAT_OES, new Float32Array(16))
  t.equal(gl.getError(), gl.INVALID_ENUM, 'a type that isn\'t enabled sets INVALID_ENUM whatever the array')
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.BYTE, new Uint8Array(16))
  t.equal(gl.getError(), gl.INVALID_ENUM, 'and so does a type WebGL1 doesn\'t take')

  gl.getExtension('OES_texture_float')
  gl.getExtension('OES_texture_half_float')
  const cases = [
    ['UNSIGNED_BYTE', gl.UNSIGNED_BYTE, [Uint8Array, Uint8ClampedArray], [Int8Array, Uint16Array, Float32Array]],
    ['UNSIGNED_SHORT_4_4_4_4', gl.UNSIGNED_SHORT_4_4_4_4, [Uint16Array], [Uint8Array, Int16Array]],
    ['FLOAT', gl.FLOAT, [Float32Array], [Uint8Array, Uint32Array]],
    ['HALF_FLOAT_OES', HALF_FLOAT_OES, [Uint16Array], [Int16Array, Float32Array]]
  ]
  for (const [name, type, allowed, others] of cases) {
    for (const Kind of allowed) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, type, makeData(Kind))
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 1, gl.RGBA, type, makeData(Kind))
      t.equal(gl.getError(), gl.NO_ERROR, `${name} takes a ${Kind.name}`)
    }
    for (const Kind of [...others, ...NEVER_ALLOWED]) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, type, makeData(Kind))
      t.equal(gl.getError(), gl.INVALID_OPERATION, `texImage2D sets INVALID_OPERATION for ${name} in a ${Kind.name}`)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 1, gl.RGBA, type, makeData(Kind))
      t.equal(gl.getError(), gl.INVALID_OPERATION, 'and so does texSubImage2D')
    }
  }

  // A Buffer is a Uint8Array, and a typed array made in another realm, such as a vm context, isn't an instance of this realm's.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, Buffer.alloc(4))
  t.equal(gl.getError(), gl.NO_ERROR, 'UNSIGNED_BYTE takes a Buffer')
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, require('vm').runInNewContext('new Uint8Array(4)'))
  t.equal(gl.getError(), gl.NO_ERROR, 'and a Uint8Array from another realm')
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.FLOAT, Buffer.alloc(16))
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'but FLOAT doesn\'t take a Buffer')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('pixel arrays: WebGL2 texture uploads take only the typed array of their type', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const texture2D = gl.createTexture()
  const texture3D = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture2D)
  gl.bindTexture(gl.TEXTURE_3D, texture3D)

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 1, 1, 0, gl.RGBA, HALF_FLOAT_OES, new Uint16Array(16))
  t.equal(gl.getError(), gl.INVALID_ENUM, 'a type WebGL2 doesn\'t take sets INVALID_ENUM whatever the array')

  const cases = [
    ['BYTE', gl.RGBA8I, gl.RGBA_INTEGER, gl.BYTE, [Int8Array], [Uint8Array]],
    ['UNSIGNED_BYTE', gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, [Uint8Array, Uint8ClampedArray], [Int8Array]],
    ['SHORT', gl.RGBA16I, gl.RGBA_INTEGER, gl.SHORT, [Int16Array], [Uint16Array]],
    ['UNSIGNED_SHORT', gl.RGBA16UI, gl.RGBA_INTEGER, gl.UNSIGNED_SHORT, [Uint16Array], [Int16Array]],
    ['UNSIGNED_SHORT_5_6_5', gl.RGB565, gl.RGB, gl.UNSIGNED_SHORT_5_6_5, [Uint16Array], [Uint8Array]],
    ['INT', gl.RGBA32I, gl.RGBA_INTEGER, gl.INT, [Int32Array], [Uint32Array]],
    ['UNSIGNED_INT', gl.RGBA32UI, gl.RGBA_INTEGER, gl.UNSIGNED_INT, [Uint32Array], [Int32Array]],
    ['UNSIGNED_INT_2_10_10_10_REV', gl.RGB10_A2, gl.RGBA, gl.UNSIGNED_INT_2_10_10_10_REV, [Uint32Array], [Uint16Array]],
    ['HALF_FLOAT', gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, [Uint16Array], [Float32Array]],
    ['FLOAT', gl.RGBA32F, gl.RGBA, gl.FLOAT, [Float32Array], [Uint32Array]]
  ]
  for (const [name, internalFormat, format, type, allowed, others] of cases) {
    for (const Kind of allowed) {
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 1, 1, 0, format, type, makeData(Kind))
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 1, format, type, makeData(Kind))
      gl.texImage3D(gl.TEXTURE_3D, 0, internalFormat, 1, 1, 1, 0, format, type, makeData(Kind))
      gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, 1, 1, 1, format, type, makeData(Kind))
      t.equal(gl.getError(), gl.NO_ERROR, `${name} takes a ${Kind.name}`)
    }
    for (const Kind of [...others, ...NEVER_ALLOWED]) {
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 1, 1, 0, format, type, makeData(Kind))
      t.equal(gl.getError(), gl.INVALID_OPERATION, `texImage2D sets INVALID_OPERATION for ${name} in a ${Kind.name}`)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 1, format, type, makeData(Kind))
      t.equal(gl.getError(), gl.INVALID_OPERATION, 'and so does texSubImage2D')
      gl.texImage3D(gl.TEXTURE_3D, 0, internalFormat, 1, 1, 1, 0, format, type, makeData(Kind))
      t.equal(gl.getError(), gl.INVALID_OPERATION, 'and texImage3D')
      gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, 1, 1, 1, format, type, makeData(Kind))
      t.equal(gl.getError(), gl.INVALID_OPERATION, 'and texSubImage3D')
    }
  }

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Float32Array(16), 4)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'texImage2D sets INVALID_OPERATION for the wrong typed array with a srcOffset')

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH32F_STENCIL8, 1, 1, 0, gl.DEPTH_STENCIL, gl.FLOAT_32_UNSIGNED_INT_24_8_REV, null)
  t.equal(gl.getError(), gl.NO_ERROR, 'FLOAT_32_UNSIGNED_INT_24_8_REV takes null')
  for (const Kind of [Float32Array, Uint32Array]) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH32F_STENCIL8, 1, 1, 0, gl.DEPTH_STENCIL, gl.FLOAT_32_UNSIGNED_INT_24_8_REV, makeData(Kind))
    t.equal(gl.getError(), gl.INVALID_OPERATION, `but sets INVALID_OPERATION for a ${Kind.name}`)
  }

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

for (const webgl2 of [false, true]) {
  tape(`pixel arrays: WebGL${webgl2 ? 2 : 1} readPixels takes only the typed array of its type`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })
    gl.clearColor(1, 0.4, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    for (const Kind of [Uint8Array, Uint8ClampedArray]) {
      const pixels = makeData(Kind)
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      t.deepEqual([...pixels.subarray(0, 4)], [255, 102, 0, 255], `UNSIGNED_BYTE reads into a ${Kind.name}`)
    }
    t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

    for (const Kind of [Int8Array, Uint16Array, Float32Array, ...NEVER_ALLOWED]) {
      const pixels = makeData(Kind)
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      t.equal(gl.getError(), gl.INVALID_OPERATION, `UNSIGNED_BYTE sets INVALID_OPERATION for a ${Kind.name}`)
      t.ok(new Uint8Array(pixels.buffer).every(value => value === 0), 'without reading into it')
    }

    // Depth types are for textures only.
    gl.readPixels(0, 0, 1, 1, gl.RGBA, webgl2 ? gl.UNSIGNED_INT_24_8 : gl.UNSIGNED_SHORT, new Uint8Array(16))
    t.equal(gl.getError(), gl.INVALID_ENUM, 'a type readPixels doesn\'t take sets INVALID_ENUM whatever the array')

    if (webgl2) {
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Float32Array(16), 4)
      t.equal(gl.getError(), gl.INVALID_OPERATION, 'UNSIGNED_BYTE sets INVALID_OPERATION for the wrong typed array with a dstOffset')
    }

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}

// Pixel arguments that aren't typed arrays.
const NOT_TYPED_ARRAYS = [
  ['ArrayBuffer', () => new ArrayBuffer(16)],
  ['array', () => new Array(16).fill(0)],
  ['plain object', () => ({})]
]

tape('pixel arrays: WebGL1 throws a TypeError for pixel data that isn\'t a typed array', function (t) {
  const gl = createContext(1, 1)
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)

  const imageData = ['ImageData-like object', () => ({ width: 1, height: 1, data: new Uint8ClampedArray(4) })]
  for (const [name, make] of [...NOT_TYPED_ARRAYS, imageData]) {
    t.throws(() => gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, make()), TypeError, `texImage2D throws: ${name}`)
    t.throws(() => gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, make()), TypeError, 'and so does texSubImage2D')
    t.throws(() => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, make()), TypeError, 'and readPixels')
  }
  t.equal(gl.getError(), gl.NO_ERROR, 'without setting an error')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('pixel arrays: WebGL2 takes pixel data that isn\'t a typed array as an offset into a pixel buffer, where its forms take one', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const texture2D = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture2D)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.bindTexture(gl.TEXTURE_3D, gl.createTexture())
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)

  for (const [name, make] of NOT_TYPED_ARRAYS) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, make())
    t.equal(gl.getError(), gl.INVALID_OPERATION, `texImage2D sets INVALID_OPERATION without a pixel unpack buffer: ${name}`)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, make())
    t.equal(gl.getError(), gl.INVALID_OPERATION, 'and so does texSubImage2D')
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, make())
    t.equal(gl.getError(), gl.INVALID_OPERATION, 'and texImage3D')
    gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, make())
    t.equal(gl.getError(), gl.INVALID_OPERATION, 'and texSubImage3D')
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, make())
    t.equal(gl.getError(), gl.INVALID_OPERATION, 'and readPixels without a pixel pack buffer')

    t.throws(() => gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, make(), 0), TypeError, 'but texImage2D with a srcOffset throws a TypeError')
    t.throws(() => gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, make(), 0), TypeError, 'and so does texSubImage2D')
    t.throws(() => gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, make(), 0), TypeError, 'and texImage3D')
    t.throws(() => gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, make(), 0), TypeError, 'and texSubImage3D')
    t.throws(() => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, make(), 0), TypeError, 'and readPixels with a dstOffset')
  }

  // An ArrayBuffer converts to offset 0.
  const unpackBuffer = gl.createBuffer()
  gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, unpackBuffer)
  gl.bufferData(gl.PIXEL_UNPACK_BUFFER, new Uint8Array([255, 102, 0, 255]), gl.STATIC_DRAW)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new ArrayBuffer(4))
  t.equal(gl.getError(), gl.NO_ERROR, 'with a pixel unpack buffer, texImage2D takes an ArrayBuffer as offset 0')
  gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null)
  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture2D, 0)
  const pixel = new Uint8Array(4)
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
  t.deepEqual([...pixel], [255, 102, 0, 255], 'and uploads the pixel buffer\'s data')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
