import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const mod = _require('./dist/index.js');

export const createHeadlessGL = mod.createHeadlessGL;
export const createContext = mod.createContext;
export const WebGLRenderingContext = mod.WebGLRenderingContext;
export const WebGL2RenderingContext = mod.WebGL2RenderingContext;
