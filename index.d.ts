declare namespace createContext {
  interface STACKGL_destroy_context {
      destroy(): void;
  }

  interface STACKGL_resize_drawingbuffer {
      resize(width: GLint, height: GLint): void;
  }

  interface StackGLExtension {
      getExtension(extensionName: "STACKGL_destroy_context"): STACKGL_destroy_context | null;
      getExtension(extensionName: "STACKGL_resize_drawingbuffer"): STACKGL_resize_drawingbuffer | null;
  }

  const WebGLRenderingContext: WebGLRenderingContext & StackGLExtension & {
      new(): WebGLRenderingContext & StackGLExtension;
      prototype: WebGLRenderingContext & StackGLExtension;
  };

  const WebGL2RenderingContext: WebGL2RenderingContext & StackGLExtension & {
      new(): WebGL2RenderingContext & StackGLExtension;
      prototype: WebGL2RenderingContext & StackGLExtension;
  };
}

/**
 * @throws {Error} with the code `HEADLESS_GL_CONTEXT_CREATION_FAILED` if the context can't be created, for example when the ANGLE libraries can't be loaded.
 * @throws {RangeError} if `width` or `height` is less than 1.
 */
declare function createContext(
  width: number,
  height: number,
  options?: WebGLContextAttributes & { createWebGL2Context?: false },
): WebGLRenderingContext & createContext.StackGLExtension;

/**
 * @throws {Error} with the code `HEADLESS_GL_CONTEXT_CREATION_FAILED` if the context can't be created, for example when the ANGLE libraries can't be loaded.
 * @throws {RangeError} if `width` or `height` is less than 1.
 */
declare function createContext(
  width: number,
  height: number,
  options: WebGLContextAttributes & { createWebGL2Context: true }
): WebGL2RenderingContext & createContext.StackGLExtension;

/**
 * @throws {Error} with the code `HEADLESS_GL_CONTEXT_CREATION_FAILED` if the context can't be created, for example when the ANGLE libraries can't be loaded.
 * @throws {RangeError} if `width` or `height` is less than 1.
 */
declare function createContext(
  width: number,
  height: number,
  options?: WebGLContextAttributes & { createWebGL2Context?: boolean }
): (WebGLRenderingContext | WebGL2RenderingContext) & createContext.StackGLExtension;

export = createContext;
