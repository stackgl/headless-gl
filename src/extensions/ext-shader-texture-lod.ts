export class EXTShaderTextureLod {}

export function getEXTShaderTextureLod(
  context: any,
): EXTShaderTextureLod | null {
  const exts = context.getSupportedExtensions();
  if (exts && exts.indexOf('EXT_shader_texture_lod') >= 0) {
    return new EXTShaderTextureLod();
  }
  return null;
}
