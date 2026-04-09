export function createContext(
  width: number,
  height: number,
  options?: WebGLContextAttributes,
): WebGLRenderingContext | null {
  width = width | 0;
  height = height | 0;
  if (!(width > 0 && height > 0)) return null;

  const canvas = document.createElement('canvas');
  if (!canvas) return null;

  let gl: WebGLRenderingContext | null = null;
  canvas.width = width;
  canvas.height = height;

  try {
    gl = canvas.getContext('webgl', options);
  } catch {
    try {
      gl = canvas.getContext(
        'experimental-webgl',
        options,
      ) as WebGLRenderingContext | null;
    } catch {
      return null;
    }
  }

  if (!gl) return null;

  const _getExtension = gl.getExtension.bind(gl);
  const extDestroy = {
    destroy: function () {
      const loseContext = _getExtension('WEBGL_lose_context');
      if (loseContext) loseContext.loseContext();
    },
  };

  const extResize = {
    resize: function (w: number, h: number) {
      canvas.width = w;
      canvas.height = h;
    },
  };

  const _supportedExtensions = gl.getSupportedExtensions()!.slice();
  _supportedExtensions.push(
    'STACKGL_destroy_context',
    'STACKGL_resize_drawingbuffer',
  );

  gl.getSupportedExtensions = function () {
    return _supportedExtensions.slice();
  };

  gl.getExtension = function (extName: string): any {
    const name = extName.toLowerCase();
    if (name === 'stackgl_resize_drawingbuffer') return extResize;
    if (name === 'stackgl_destroy_context') return extDestroy;
    return _getExtension(extName);
  };

  return gl;
}
