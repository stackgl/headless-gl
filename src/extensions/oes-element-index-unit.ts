export class OESElementIndexUint {}

export function getOESElementIndexUint(
  context: any,
): OESElementIndexUint | null {
  const exts = context.getSupportedExtensions();
  if (exts && exts.indexOf('OES_element_index_uint') >= 0) {
    return new OESElementIndexUint();
  }
  return null;
}
