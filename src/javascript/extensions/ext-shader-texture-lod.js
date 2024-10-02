class EXTShaderTextureLod {}

function getEXTShaderTextureLod (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('EXT_shader_texture_lod') >= 0) {
    result = new EXTShaderTextureLod()
  }

  return result
}

module.exports = { getEXTShaderTextureLod, EXTShaderTextureLod }
