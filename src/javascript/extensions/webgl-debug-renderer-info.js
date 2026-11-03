class WebGLDebugRendererInfo {
  constructor () {
    this.UNMASKED_VENDOR_WEBGL = 0x9245
    this.UNMASKED_RENDERER_WEBGL = 0x9246
  }
}

function getWebGLDebugRendererInfo (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('WEBGL_debug_renderer_info') >= 0) {
    result = new WebGLDebugRendererInfo()
  }

  return result
}

module.exports = { getWebGLDebugRendererInfo, WebGLDebugRendererInfo }
