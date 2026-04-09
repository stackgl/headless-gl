// eslint-disable-next-line @typescript-eslint/no-require-imports
const NativeWebGL = require('bindings')('webgl') as {
  WebGLRenderingContext: any;
  cleanup: () => void;
  setError: (error: number) => void;
};
const NativeWebGLRenderingContext: any = NativeWebGL.WebGLRenderingContext;
process.on('exit', NativeWebGL.cleanup);

const gl: any = NativeWebGLRenderingContext.prototype;

// from binding.gyp
delete gl['1.0.0'];
delete NativeWebGLRenderingContext['1.0.0'];

export { gl, NativeWebGL, NativeWebGLRenderingContext };
