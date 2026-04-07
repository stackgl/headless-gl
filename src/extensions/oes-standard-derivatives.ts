export class OESStandardDerivatives {
  FRAGMENT_SHADER_DERIVATIVE_HINT_OES: number;

  constructor() {
    this.FRAGMENT_SHADER_DERIVATIVE_HINT_OES = 0x8b8b;
  }
}

export function getOESStandardDerivatives(
  context: any,
): OESStandardDerivatives | null {
  const exts = context.getSupportedExtensions();
  if (exts && exts.indexOf('OES_standard_derivatives') >= 0) {
    return new OESStandardDerivatives();
  }
  return null;
}
