export class EXTColorBufferFloat {}

export function getEXTColorBufferFloat(
  context: any,
): EXTColorBufferFloat | null {
  const exts = context.getSupportedExtensions();
  if (exts && exts.indexOf('EXT_color_buffer_float') >= 0) {
    return new EXTColorBufferFloat();
  }
  return null;
}
