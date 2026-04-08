class EXTColorBufferFloat {}

function getEXTColorBufferFloat (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('EXT_color_buffer_float') >= 0) {
    result = new EXTColorBufferFloat()
  }

  return result
}

module.exports = { getEXTColorBufferFloat, EXTColorBufferFloat }
