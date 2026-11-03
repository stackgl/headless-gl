class EXTFloatBlend {}

function getEXTFloatBlend (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('EXT_float_blend') >= 0) {
    result = new EXTFloatBlend()
  }

  return result
}

module.exports = { getEXTFloatBlend, EXTFloatBlend }
