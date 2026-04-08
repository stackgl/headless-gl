import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const mod = _require('./index.js');

export const createHeadlessGL = mod;
export const createContext = mod;
export const WebGLRenderingContext = mod.WebGLRenderingContext;
export const WebGL2RenderingContext = mod.WebGL2RenderingContext;
export default mod;
