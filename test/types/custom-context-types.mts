// A project with the DOM types that retypes every context as the DOM's through CustomContextTypes.
import createGL from 'gl'

declare module 'gl' {
  interface CustomContextTypes {
    WebGLRenderingContext: globalThis.WebGLRenderingContext
    WebGL2RenderingContext: globalThis.WebGL2RenderingContext
  }
}

declare function useContext (context: WebGLRenderingContext): void
declare function useContext2 (context: WebGL2RenderingContext): void

const gl = createGL(1, 1)
useContext(gl)
const canvas: HTMLCanvasElement | OffscreenCanvas = gl.canvas
gl.getExtension('STACKGL_destroy_context').destroy()

const gl2 = createGL(1, 1, { createWebGL2Context: true })
useContext2(gl2)

export { canvas }
