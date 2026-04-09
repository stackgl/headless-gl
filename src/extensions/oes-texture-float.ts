export class OESTextureFloat {}

export function getOESTextureFloat(context: any): OESTextureFloat | null {
  const exts = context.getSupportedExtensions();
  if (exts && exts.indexOf('OES_texture_float') >= 0) {
    return new OESTextureFloat();
  }
  return null;
}
