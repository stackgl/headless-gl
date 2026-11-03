class EXTTextureCompressionRGTC {
  constructor () {
    this.COMPRESSED_RED_RGTC1_EXT = 0x8DBB
    this.COMPRESSED_SIGNED_RED_RGTC1_EXT = 0x8DBC
    this.COMPRESSED_RED_GREEN_RGTC2_EXT = 0x8DBD
    this.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT = 0x8DBE
  }
}

function getEXTTextureCompressionRGTC (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('EXT_texture_compression_rgtc') >= 0) {
    result = new EXTTextureCompressionRGTC()
  }

  return result
}

module.exports = { getEXTTextureCompressionRGTC, EXTTextureCompressionRGTC }
