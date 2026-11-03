class WebGLDepthTexture {
  constructor () {
    this.UNSIGNED_INT_24_8_WEBGL = 0x84FA
  }
}

function getWebGLDepthTexture (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('WEBGL_depth_texture') >= 0) {
    result = new WebGLDepthTexture()
  }

  return result
}

module.exports = { getWebGLDepthTexture, WebGLDepthTexture }
