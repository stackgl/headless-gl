export class EXTBlendMinMax {
  MIN_EXT: number;
  MAX_EXT: number;

  constructor() {
    this.MIN_EXT = 0x8007;
    this.MAX_EXT = 0x8008;
  }
}

export function getEXTBlendMinMax(context: any): EXTBlendMinMax | null {
  const exts = context.getSupportedExtensions();
  if (exts && exts.indexOf('EXT_blend_minmax') >= 0) {
    return new EXTBlendMinMax();
  }
  return null;
}
