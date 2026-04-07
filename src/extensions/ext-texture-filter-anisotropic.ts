export class EXTTextureFilterAnisotropic {
  TEXTURE_MAX_ANISOTROPY_EXT: number;
  MAX_TEXTURE_MAX_ANISOTROPY_EXT: number;

  constructor() {
    this.TEXTURE_MAX_ANISOTROPY_EXT = 0x84fe;
    this.MAX_TEXTURE_MAX_ANISOTROPY_EXT = 0x84ff;
  }
}

export function getEXTTextureFilterAnisotropic(
  context: any,
): EXTTextureFilterAnisotropic | null {
  const exts = context.getSupportedExtensions();
  if (exts && exts.indexOf('EXT_texture_filter_anisotropic') >= 0) {
    return new EXTTextureFilterAnisotropic();
  }
  return null;
}
