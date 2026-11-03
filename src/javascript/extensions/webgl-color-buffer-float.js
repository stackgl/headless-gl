class WebGLColorBufferFloat {
  constructor () {
    this.RGBA32F_EXT = 0x8814
    this.FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE_EXT = 0x8211
    this.UNSIGNED_NORMALIZED_EXT = 0x8C17
  }
}

function getWebGLColorBufferFloat (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('WEBGL_color_buffer_float') >= 0) {
    result = new WebGLColorBufferFloat()
  }

  return result
}

module.exports = { getWebGLColorBufferFloat, WebGLColorBufferFloat }
