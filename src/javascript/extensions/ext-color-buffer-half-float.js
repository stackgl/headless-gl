class EXTColorBufferHalfFloat {
  constructor () {
    this.RGBA16F_EXT = 0x881A
    this.RGB16F_EXT = 0x881B
    this.FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE_EXT = 0x8211
    this.UNSIGNED_NORMALIZED_EXT = 0x8C17
  }
}

function getEXTColorBufferHalfFloat (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('EXT_color_buffer_half_float') >= 0) {
    result = new EXTColorBufferHalfFloat()
  }

  return result
}

module.exports = { getEXTColorBufferHalfFloat, EXTColorBufferHalfFloat }
