import { createContext } from './node-index';
export {
  WebGLRenderingContext,
  WebGL2RenderingContext,
} from './webgl-rendering-context';

// Named export for dynamic import() consumers: await import('@roomle/headless-gl')
export const createHeadlessGL = createContext;
export { createContext };
