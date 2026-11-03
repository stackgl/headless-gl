class EXTsRGB {
  constructor () {
    this.SRGB_EXT = 0x8C40
    this.SRGB_ALPHA_EXT = 0x8C42
    this.SRGB8_ALPHA8_EXT = 0x8C43
    this.FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING_EXT = 0x8210
  }
}

function getEXTsRGB (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('EXT_sRGB') >= 0) {
    result = new EXTsRGB()
  }

  return result
}

module.exports = { getEXTsRGB, EXTsRGB }
