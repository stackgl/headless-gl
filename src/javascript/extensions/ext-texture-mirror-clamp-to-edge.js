class EXTTextureMirrorClampToEdge {
  constructor () {
    this.MIRROR_CLAMP_TO_EDGE_EXT = 0x8743
  }
}

function getEXTTextureMirrorClampToEdge (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('EXT_texture_mirror_clamp_to_edge') >= 0) {
    result = new EXTTextureMirrorClampToEdge()
  }

  return result
}

module.exports = { getEXTTextureMirrorClampToEdge, EXTTextureMirrorClampToEdge }
