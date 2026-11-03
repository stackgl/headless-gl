class WebGLCompressedTextureS3TC {
  constructor () {
    this.COMPRESSED_RGB_S3TC_DXT1_EXT = 0x83F0
    this.COMPRESSED_RGBA_S3TC_DXT1_EXT = 0x83F1
    this.COMPRESSED_RGBA_S3TC_DXT3_EXT = 0x83F2
    this.COMPRESSED_RGBA_S3TC_DXT5_EXT = 0x83F3
  }
}

function getWebGLCompressedTextureS3TC (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('WEBGL_compressed_texture_s3tc') >= 0) {
    result = new WebGLCompressedTextureS3TC()
  }

  return result
}

module.exports = { getWebGLCompressedTextureS3TC, WebGLCompressedTextureS3TC }
