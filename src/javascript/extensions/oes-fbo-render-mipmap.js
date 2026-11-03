class OESFboRenderMipmap {}

function getOESFboRenderMipmap (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('OES_fbo_render_mipmap') >= 0) {
    result = new OESFboRenderMipmap()
  }

  return result
}

module.exports = { getOESFboRenderMipmap, OESFboRenderMipmap }
