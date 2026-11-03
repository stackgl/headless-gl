const { gl } = require('./native-gl')

const { WebGLUniformLocation } = require('./webgl-uniform-location')

function checkObject (object) {
  return typeof object === 'object' ||
    (object === undefined)
}

// Works around the fact that "instanceof" doesn't work for polyfilled types
function isInstanceOfType (instance, type) {
  return Object.prototype.toString.call(instance) === `[object ${type}]`
}

function checkUniform (program, location) {
  return location instanceof WebGLUniformLocation &&
    location._program === program &&
    location._linkCount === program._linkCount
}

function isTypedArray (data) {
  return isInstanceOfType(data, 'Uint8Array') ||
    isInstanceOfType(data, 'Uint8ClampedArray') ||
    isInstanceOfType(data, 'Int8Array') ||
    isInstanceOfType(data, 'Uint16Array') ||
    isInstanceOfType(data, 'Int16Array') ||
    isInstanceOfType(data, 'Uint32Array') ||
    isInstanceOfType(data, 'Int32Array') ||
    isInstanceOfType(data, 'Float32Array') ||
    isInstanceOfType(data, 'Float64Array')
}

// Don't allow: ", $, `, @, \, ', \0
function isValidString (str) {
  // Remove comments first
  const c = str.replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm, '')
  return !(/["$`@\\'\0]/.test(c))
}

function vertexCount (primitive, count) {
  switch (primitive) {
    case gl.TRIANGLES:
      return count - (count % 3)
    case gl.LINES:
      return count - (count % 2)
    case gl.LINE_LOOP:
    case gl.POINTS:
      return count
    case gl.TRIANGLE_FAN:
    case gl.LINE_STRIP:
      if (count < 2) {
        return 0
      }
      return count
    case gl.TRIANGLE_STRIP:
      if (count < 3) {
        return 0
      }
      return count
    default:
      return -1
  }
}

function typeSize (type) {
  switch (type) {
    case gl.UNSIGNED_BYTE:
    case gl.BYTE:
      return 1
    case gl.UNSIGNED_SHORT:
    case gl.SHORT:
      return 2
    case gl.UNSIGNED_INT:
    case gl.INT:
    case gl.FLOAT:
      return 4
  }
  return 0
}

function uniformTypeSize (type) {
  switch (type) {
    case gl.BOOL_VEC4:
    case gl.INT_VEC4:
    case gl.FLOAT_VEC4:
      return 4

    case gl.BOOL_VEC3:
    case gl.INT_VEC3:
    case gl.FLOAT_VEC3:
      return 3

    case gl.BOOL_VEC2:
    case gl.INT_VEC2:
    case gl.FLOAT_VEC2:
      return 2

    case gl.BOOL:
    case gl.INT:
    case gl.FLOAT:
    case gl.SAMPLER_2D:
    case gl.SAMPLER_CUBE:
      return 1

    default:
      return 0
  }
}

function unpackTypedArray (array) {
  return (new Uint8Array(array.buffer)).subarray(
    array.byteOffset,
    array.byteLength + array.byteOffset)
}

function extractImageData (pixels) {
  if (typeof pixels === 'object' && typeof pixels.width !== 'undefined' && typeof pixels.height !== 'undefined') {
    if (typeof pixels.data !== 'undefined') {
      return pixels
    }

    let context = null

    if (typeof pixels.getContext === 'function') {
      context = pixels.getContext('2d')
    } else if (typeof pixels.src !== 'undefined' && typeof document === 'object' && typeof document.createElement === 'function') {
      const canvas = document.createElement('canvas')

      if (typeof canvas === 'object' && typeof canvas.getContext === 'function') {
        canvas.width = pixels.width
        canvas.height = pixels.height
        context = canvas.getContext('2d')

        if (context !== null) {
          context.drawImage(pixels, 0, 0)
        }
      }
    }

    if (context !== null) {
      return context.getImageData(0, 0, pixels.width, pixels.height)
    }
  }

  return null
}

// Texture formats and types that aren't WebGL1 constants.
const RED = 0x1903
const RG = 0x8227
const RED_INTEGER = 0x8D94
const RG_INTEGER = 0x8228
const RGB_INTEGER = 0x8D98
const RGBA_INTEGER = 0x8D99
const SRGB_EXT = 0x8C40
const SRGB_ALPHA_EXT = 0x8C42
const HALF_FLOAT = 0x140B
const HALF_FLOAT_OES = 0x8D61
const UNSIGNED_INT_2_10_10_10_REV = 0x8368
const UNSIGNED_INT_10F_11F_11F_REV = 0x8C3B

// The channels of an RGBA image that each format keeps, and whether the format is an integer one.
const IMAGE_FORMATS = new Map([
  [gl.RGBA, { channels: [0, 1, 2, 3] }],
  [SRGB_ALPHA_EXT, { channels: [0, 1, 2, 3] }],
  [RGBA_INTEGER, { channels: [0, 1, 2, 3], integer: true }],
  [gl.RGB, { channels: [0, 1, 2] }],
  [SRGB_EXT, { channels: [0, 1, 2] }],
  [RGB_INTEGER, { channels: [0, 1, 2], integer: true }],
  [RG, { channels: [0, 1] }],
  [RG_INTEGER, { channels: [0, 1], integer: true }],
  [RED, { channels: [0] }],
  [RED_INTEGER, { channels: [0], integer: true }],
  [gl.LUMINANCE, { channels: [0] }],
  [gl.ALPHA, { channels: [3] }],
  [gl.LUMINANCE_ALPHA, { channels: [0, 3] }]
])

const floatBits = new Float32Array(1)
const uintBits = new Uint32Array(floatBits.buffer)

// Rounds to the nearest half float, with ties to even, as Float16Array does. It stands in for Float16Array on Node 22, which doesn't have it, and can go when Node 22 support ends.
function toHalfFloat (value) {
  floatBits[0] = value
  const bits = uintBits[0]
  const sign = (bits >>> 16) & 0x8000
  const exponent = ((bits >>> 23) & 0xff) - 127 + 15
  let mantissa = bits & 0x7fffff
  if (((bits >>> 23) & 0xff) === 0xff) {
    return sign | 0x7c00 | (mantissa !== 0 ? 0x200 : 0)
  }
  if (exponent >= 31) {
    return sign | 0x7c00
  }
  if (exponent < -10) {
    return sign
  }

  // Normal half floats drop 13 bits of the mantissa. Subnormal ones also shift in the implicit leading 1.
  let shift = 13
  let half = (exponent << 10) | (mantissa >>> 13)
  if (exponent <= 0) {
    mantissa |= 0x800000
    shift = 14 - exponent
    half = mantissa >>> shift
  }
  const remainder = mantissa & ((1 << shift) - 1)
  const halfway = 1 << (shift - 1)
  if (remainder > halfway || (remainder === halfway && (half & 1))) {
    half++
  }
  return sign | half
}

// Ports of ANGLE's gl::float32ToFloat11 and gl::float32ToFloat10 from src/common/mathutil.h, which round to the nearest unsigned 11-bit and 10-bit float.
function toFloat11 (value) {
  floatBits[0] = value
  const bits = uintBits[0]
  let abs = bits & 0x7FFFFFFF
  if ((abs & 0x7F800000) === 0x7F800000) {
    if ((abs & 0x7FFFFF) !== 0) {
      return 0x7C0 | (((abs >>> 17) | (abs >>> 11) | (abs >>> 6) | abs) & 0x3F)
    }
    return bits & 0x80000000 ? 0 : 0x7C0
  }
  if (bits & 0x80000000) {
    return 0
  }
  if (abs > 0x477E0000) {
    return 0x7BF
  }
  if (abs < 0x35000080) {
    return 0
  }
  if (abs < 0x38800000) {
    abs = (0x800000 | (abs & 0x7FFFFF)) >>> (113 - (abs >>> 23))
  } else {
    abs = (abs + 0xC8000000) >>> 0
  }
  return ((abs + 0xFFFF + ((abs >>> 17) & 1)) >>> 17) & 0x7FF
}

function toFloat10 (value) {
  floatBits[0] = value
  const bits = uintBits[0]
  let abs = bits & 0x7FFFFFFF
  if ((abs & 0x7F800000) === 0x7F800000) {
    if ((abs & 0x7FFFFF) !== 0) {
      return 0x3E0 | (((abs >>> 18) | (abs >>> 13) | (abs >>> 3) | abs) & 0x1F)
    }
    return bits & 0x80000000 ? 0 : 0x3E0
  }
  if (bits & 0x80000000) {
    return 0
  }
  if (abs > 0x477C0000) {
    return 0x3DF
  }
  if (abs < 0x35800040) {
    return 0
  }
  if (abs < 0x38800000) {
    abs = (0x800000 | (abs & 0x7FFFFF)) >>> (113 - (abs >>> 23))
  } else {
    abs = (abs + 0xC8000000) >>> 0
  }
  return ((abs + 0x1FFFF + ((abs >>> 18) & 1)) >>> 18) & 0x3FF
}

const HALF_FLOAT_IMAGE_TYPE = globalThis.Float16Array
  ? { TypedArray: globalThis.Float16Array, float: true, packChannel: value => value }
  : { TypedArray: Uint16Array, float: true, packChannel: toHalfFloat }

// How images are converted to each type, either a channel at a time or a pixel at a time. Float types take channels from 0 to 1, and the others from 0 to 255.
const IMAGE_TYPES = new Map([
  [gl.UNSIGNED_BYTE, { TypedArray: Uint8Array, packChannel: value => value }],
  [gl.FLOAT, { TypedArray: Float32Array, float: true, packChannel: value => value }],
  [HALF_FLOAT, HALF_FLOAT_IMAGE_TYPE],
  [HALF_FLOAT_OES, HALF_FLOAT_IMAGE_TYPE],
  [gl.UNSIGNED_SHORT_5_6_5, { TypedArray: Uint16Array, packPixel: ([r, g, b]) => ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3) }],
  [gl.UNSIGNED_SHORT_4_4_4_4, { TypedArray: Uint16Array, packPixel: ([r, g, b, a]) => ((r & 0xF0) << 8) | ((g & 0xF0) << 4) | (b & 0xF0) | (a >> 4) }],
  [gl.UNSIGNED_SHORT_5_5_5_1, { TypedArray: Uint16Array, packPixel: ([r, g, b, a]) => ((r & 0xF8) << 8) | ((g & 0xF8) << 3) | ((b & 0xF8) >> 2) | (a >> 7) }],
  [UNSIGNED_INT_2_10_10_10_REV, {
    TypedArray: Uint32Array,
    float: true,
    packPixel: ([r, g, b, a]) => (Math.round(r * 1023) | (Math.round(g * 1023) << 10) | (Math.round(b * 1023) << 20) | (Math.round(a * 3) << 30)) >>> 0
  }],
  [UNSIGNED_INT_10F_11F_11F_REV, {
    TypedArray: Uint32Array,
    float: true,
    packPixel: ([r, g, b]) => (toFloat11(r) | (toFloat11(g) << 11) | (toFloat10(b) << 22)) >>> 0
  }]
])

// Converts an image's RGBA pixels, with 8 bits per channel, to the format and type of a texture upload, as browsers do.
// It premultiplies alpha, except for integer formats, and flips the rows if asked, then packs the pixels tightly. Returns null for a format or type that images can't be uploaded as.
function convertImagePixels (pixels, width, height, format, type, premultiplyAlpha, flipY) {
  const formatInfo = IMAGE_FORMATS.get(format)
  const typeInfo = IMAGE_TYPES.get(type)
  if (!formatInfo || !typeInfo) {
    return null
  }
  premultiplyAlpha = premultiplyAlpha && !formatInfo.integer
  const { channels } = formatInfo
  const { TypedArray, float, packChannel, packPixel } = typeInfo

  // Most uploads from images are RGBA with 8 bits per channel, which only need their rows reordered if they're flipped.
  if (format === gl.RGBA && type === gl.UNSIGNED_BYTE && !premultiplyAlpha) {
    const source = ArrayBuffer.isView(pixels) ? pixels : Uint8Array.from(pixels)
    if (!flipY) {
      return source
    }
    const result = new Uint8Array(width * height * 4)
    const rowSize = width * 4
    for (let row = 0; row < height; row++) {
      const sourceRow = height - 1 - row
      result.set(source.subarray(sourceRow * rowSize, (sourceRow + 1) * rowSize), row * rowSize)
    }
    return result
  }

  const result = new TypedArray(width * height * (packPixel ? 1 : channels.length))
  const rgba = [0, 0, 0, 0]
  for (let row = 0; row < height; row++) {
    const sourceRow = flipY ? height - 1 - row : row
    for (let column = 0; column < width; column++) {
      const source = (sourceRow * width + column) * 4
      const alpha = pixels[source + 3]
      for (let channel = 0; channel < 4; channel++) {
        let value = pixels[source + channel]
        if (float) {
          value /= 255
          if (premultiplyAlpha && channel < 3) {
            value *= alpha / 255
          }
        } else if (premultiplyAlpha && channel < 3) {
          value = Math.floor(value * alpha / 255)
        }
        rgba[channel] = value
      }

      const pixel = row * width + column
      if (packPixel) {
        result[pixel] = packPixel(rgba)
      } else {
        for (let i = 0; i < channels.length; i++) {
          result[pixel * channels.length + i] = packChannel(rgba[channels[i]])
        }
      }
    }
  }
  return result
}

function formatSize (internalFormat) {
  switch (internalFormat) {
    case gl.ALPHA:
    case gl.LUMINANCE:
      return 1
    case gl.LUMINANCE_ALPHA:
      return 2
    case gl.RGB:
      return 3
    case gl.RGBA:
      return 4
  }
  return 0
}

function convertPixels (pixels) {
  if (typeof pixels === 'object' && pixels !== null) {
    if (isInstanceOfType(pixels, 'ArrayBuffer')) {
      return new Uint8Array(pixels)
    } else if (ArrayBuffer.isView(pixels)) {
      return unpackTypedArray(pixels)
    }
  }
  return null
}

function checkFormat (format) {
  return (
    format === gl.ALPHA ||
    format === gl.LUMINANCE_ALPHA ||
    format === gl.LUMINANCE ||
    format === gl.RGB ||
    format === gl.RGBA)
}

function validCubeTarget (target) {
  return target === gl.TEXTURE_CUBE_MAP_POSITIVE_X ||
    target === gl.TEXTURE_CUBE_MAP_NEGATIVE_X ||
    target === gl.TEXTURE_CUBE_MAP_POSITIVE_Y ||
    target === gl.TEXTURE_CUBE_MAP_NEGATIVE_Y ||
    target === gl.TEXTURE_CUBE_MAP_POSITIVE_Z ||
    target === gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
}

module.exports = {
  checkObject,
  isInstanceOfType,
  isTypedArray,
  isValidString,
  vertexCount,
  typeSize,
  uniformTypeSize,
  unpackTypedArray,
  extractImageData,
  convertImagePixels,
  formatSize,
  checkFormat,
  checkUniform,
  convertPixels,
  validCubeTarget
}
