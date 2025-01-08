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

declare function createContext(
  width: number,
  height: number,
  options?: WebGLContextAttributes & { createWebGL2Context?: false },
): WebGLRenderingContext & createContext.StackGLExtension;

declare function createContext(
  width: number,
  height: number,
  options: WebGLContextAttributes & { createWebGL2Context: true }
): WebGL2RenderingContext & createContext.StackGLExtension;

declare function createContext(
  width: number,
  height: number,
  options?: WebGLContextAttributes & { createWebGL2Context?: boolean }
): (WebGLRenderingContext | WebGL2RenderingContext) & createContext.StackGLExtension;

export = createContext;
