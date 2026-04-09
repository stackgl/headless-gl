export class OESTextureFloatLinear {}

export function getOESTextureFloatLinear(
  context: any,
): OESTextureFloatLinear | null {
  const exts = context.getSupportedExtensions();
  if (exts && exts.indexOf('OES_texture_float_linear') >= 0) {
    return new OESTextureFloatLinear();
  }
  return null;
}
