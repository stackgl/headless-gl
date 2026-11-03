class EXTTextureCompressionBPTC {
  constructor () {
    this.COMPRESSED_RGBA_BPTC_UNORM_EXT = 0x8E8C
    this.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT = 0x8E8D
    this.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT = 0x8E8E
    this.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT = 0x8E8F
  }
}

function getEXTTextureCompressionBPTC (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('EXT_texture_compression_bptc') >= 0) {
    result = new EXTTextureCompressionBPTC()
  }

  return result
}

module.exports = { getEXTTextureCompressionBPTC, EXTTextureCompressionBPTC }
