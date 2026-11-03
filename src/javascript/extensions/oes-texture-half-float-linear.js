class OESTextureHalfFloatLinear {}

function getOESTextureHalfFloatLinear (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('OES_texture_half_float_linear') >= 0) {
    result = new OESTextureHalfFloatLinear()
  }

  return result
}

module.exports = { getOESTextureHalfFloatLinear, OESTextureHalfFloatLinear }
