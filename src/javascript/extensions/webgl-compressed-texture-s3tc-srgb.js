class WebGLCompressedTextureS3TCsRGB {
  constructor () {
    this.COMPRESSED_SRGB_S3TC_DXT1_EXT = 0x8C4C
    this.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT = 0x8C4D
    this.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT = 0x8C4E
    this.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT = 0x8C4F
  }
}

function getWebGLCompressedTextureS3TCsRGB (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('WEBGL_compressed_texture_s3tc_srgb') >= 0) {
    result = new WebGLCompressedTextureS3TCsRGB()
  }

  return result
}

module.exports = { getWebGLCompressedTextureS3TCsRGB, WebGLCompressedTextureS3TCsRGB }
