import { createContext } from './node-index';
export {
  WebGLRenderingContext,
  WebGL2RenderingContext,
} from './webgl-rendering-context';

export const createHeadlessGL = createContext;
export { createContext };
