// headless-gl declares its own WebGL types, so projects don't need TypeScript's DOM types. Its contexts don't have the browser's canvas or color space members, and texture uploads take a TexImageSource as declared below instead of DOM elements.
// To use a context where the DOM's WebGLRenderingContext is expected, cast it with `gl as WebGLRenderingContext`, or retype every context through CustomContextTypes.
import type * as WebGL from './webgl';

declare namespace createContext {
  // The WebGL declarations, copied from TypeScript's DOM types into webgl.d.ts by scripts/webgl-types.js, which checks that this list is complete.
  type ANGLE_instanced_arrays = WebGL.ANGLE_instanced_arrays;
  type AllowSharedBufferSource = WebGL.AllowSharedBufferSource;
  type EXT_blend_minmax = WebGL.EXT_blend_minmax;
  type EXT_color_buffer_float = WebGL.EXT_color_buffer_float;
  type EXT_color_buffer_half_float = WebGL.EXT_color_buffer_half_float;
  type EXT_float_blend = WebGL.EXT_float_blend;
  type EXT_frag_depth = WebGL.EXT_frag_depth;
  type EXT_sRGB = WebGL.EXT_sRGB;
  type EXT_shader_texture_lod = WebGL.EXT_shader_texture_lod;
  type EXT_texture_compression_bptc = WebGL.EXT_texture_compression_bptc;
  type EXT_texture_compression_rgtc = WebGL.EXT_texture_compression_rgtc;
  type EXT_texture_filter_anisotropic = WebGL.EXT_texture_filter_anisotropic;
  type Float32List = WebGL.Float32List;
  type GLbitfield = WebGL.GLbitfield;
  type GLboolean = WebGL.GLboolean;
  type GLclampf = WebGL.GLclampf;
  type GLenum = WebGL.GLenum;
  type GLfloat = WebGL.GLfloat;
  type GLint = WebGL.GLint;
  type GLint64 = WebGL.GLint64;
  type GLintptr = WebGL.GLintptr;
  type GLsizei = WebGL.GLsizei;
  type GLsizeiptr = WebGL.GLsizeiptr;
  type GLuint = WebGL.GLuint;
  type GLuint64 = WebGL.GLuint64;
  type HeadlessWebGL2RenderingContext = WebGL.HeadlessWebGL2RenderingContext;
  type HeadlessWebGLRenderingContext = WebGL.HeadlessWebGLRenderingContext;
  type Int32List = WebGL.Int32List;
  type KHR_parallel_shader_compile = WebGL.KHR_parallel_shader_compile;
  type OES_element_index_uint = WebGL.OES_element_index_uint;
  type OES_fbo_render_mipmap = WebGL.OES_fbo_render_mipmap;
  type OES_standard_derivatives = WebGL.OES_standard_derivatives;
  type OES_texture_float = WebGL.OES_texture_float;
  type OES_texture_float_linear = WebGL.OES_texture_float_linear;
  type OES_texture_half_float = WebGL.OES_texture_half_float;
  type OES_texture_half_float_linear = WebGL.OES_texture_half_float_linear;
  type OES_vertex_array_object = WebGL.OES_vertex_array_object;
  type OVR_multiview2 = WebGL.OVR_multiview2;
  type Uint32List = WebGL.Uint32List;
  type WEBGL_color_buffer_float = WebGL.WEBGL_color_buffer_float;
  type WEBGL_compressed_texture_astc = WebGL.WEBGL_compressed_texture_astc;
  type WEBGL_compressed_texture_etc = WebGL.WEBGL_compressed_texture_etc;
  type WEBGL_compressed_texture_etc1 = WebGL.WEBGL_compressed_texture_etc1;
  type WEBGL_compressed_texture_pvrtc = WebGL.WEBGL_compressed_texture_pvrtc;
  type WEBGL_compressed_texture_s3tc = WebGL.WEBGL_compressed_texture_s3tc;
  type WEBGL_compressed_texture_s3tc_srgb = WebGL.WEBGL_compressed_texture_s3tc_srgb;
  type WEBGL_debug_renderer_info = WebGL.WEBGL_debug_renderer_info;
  type WEBGL_debug_shaders = WebGL.WEBGL_debug_shaders;
  type WEBGL_depth_texture = WebGL.WEBGL_depth_texture;
  type WEBGL_draw_buffers = WebGL.WEBGL_draw_buffers;
  type WEBGL_lose_context = WebGL.WEBGL_lose_context;
  type WEBGL_multi_draw = WebGL.WEBGL_multi_draw;
  type WebGL2RenderingContextBase = WebGL.WebGL2RenderingContextBase;
  type WebGL2RenderingContextConstants = WebGL.WebGL2RenderingContextConstants;
  type WebGL2RenderingContextOverloads = WebGL.WebGL2RenderingContextOverloads;
  type WebGLActiveInfo = WebGL.WebGLActiveInfo;
  type WebGLBuffer = WebGL.WebGLBuffer;
  type WebGLContextAttributes = WebGL.WebGLContextAttributes;
  type WebGLFramebuffer = WebGL.WebGLFramebuffer;
  type WebGLPowerPreference = WebGL.WebGLPowerPreference;
  type WebGLProgram = WebGL.WebGLProgram;
  type WebGLQuery = WebGL.WebGLQuery;
  type WebGLRenderbuffer = WebGL.WebGLRenderbuffer;
  type WebGLRenderingContextBase = WebGL.WebGLRenderingContextBase;
  type WebGLRenderingContextConstants = WebGL.WebGLRenderingContextConstants;
  type WebGLRenderingContextOverloads = WebGL.WebGLRenderingContextOverloads;
  type WebGLSampler = WebGL.WebGLSampler;
  type WebGLShader = WebGL.WebGLShader;
  type WebGLShaderPrecisionFormat = WebGL.WebGLShaderPrecisionFormat;
  type WebGLSync = WebGL.WebGLSync;
  type WebGLTexture = WebGL.WebGLTexture;
  type WebGLTransformFeedback = WebGL.WebGLTransformFeedback;
  type WebGLUniformLocation = WebGL.WebGLUniformLocation;
  type WebGLVertexArrayObject = WebGL.WebGLVertexArrayObject;
  type WebGLVertexArrayObjectOES = WebGL.WebGLVertexArrayObjectOES;

  /**
   * What texImage2D, texSubImage2D and texSubImage3D accept in place of a typed array: an object with pixel data, like ImageData, or an object with a 2D context, like a node-canvas Canvas.
   */
  type TexImageSource = TexImageData | TexImageCanvas;

  interface TexImageData {
    readonly width: number;
    readonly height: number;
    readonly data: ArrayBufferView;
  }

  interface TexImageCanvas {
    readonly width: number;
    readonly height: number;
    getContext(contextId: "2d"): { getImageData(sx: number, sy: number, sw: number, sh: number): TexImageData } | null;
  }

  interface STACKGL_destroy_context {
    destroy(): void;
  }

  interface STACKGL_resize_drawingbuffer {
    resize(width: GLint, height: GLint): void;
  }

  interface StackGLExtension {
    getExtension(extensionName: "STACKGL_destroy_context"): STACKGL_destroy_context;
    getExtension(extensionName: "STACKGL_resize_drawingbuffer"): STACKGL_resize_drawingbuffer;
  }

  /**
   * Add WebGLRenderingContext and WebGL2RenderingContext properties to this interface to retype every context that createContext returns, for example as the DOM's types:
   *
   * ```ts
   * declare module 'gl' {
   *   interface CustomContextTypes {
   *     WebGLRenderingContext: globalThis.WebGLRenderingContext;
   *     WebGL2RenderingContext: globalThis.WebGL2RenderingContext;
   *   }
   * }
   * ```
   */
  interface CustomContextTypes {}

  type WebGLRenderingContext = (CustomContextTypes extends { WebGLRenderingContext: infer T } ? T : HeadlessWebGLRenderingContext) & StackGLExtension;

  type WebGL2RenderingContext = (CustomContextTypes extends { WebGL2RenderingContext: infer T } ? T : HeadlessWebGL2RenderingContext) & StackGLExtension;

  /**
   * The class of WebGL1 contexts, for instanceof checks. It can't be constructed directly.
   */
  const WebGLRenderingContext: WebGLRenderingContextConstants & {
    readonly prototype: WebGLRenderingContext;
    new(): never;
  };

  /**
   * The class of WebGL2 contexts, for instanceof checks. It can't be constructed directly.
   */
  const WebGL2RenderingContext: WebGL2RenderingContextConstants & {
    readonly prototype: WebGL2RenderingContext;
    new(): never;
  };

  /**
   * The WebGL context attributes, plus createWebGL2Context. Only alpha, depth, stencil, premultipliedAlpha, preserveDrawingBuffer and createWebGL2Context have an effect: antialias is always off, and the others are ignored.
   */
  interface ContextAttributes extends WebGLContextAttributes {
    createWebGL2Context?: boolean;
  }
}

/**
 * @throws {Error} with the code `HEADLESS_GL_CONTEXT_CREATION_FAILED` if the context can't be created, for example when the ANGLE libraries can't be loaded.
 * @throws {RangeError} if `width` or `height` is less than 1.
 */
declare function createContext(
  width: number,
  height: number,
  options?: createContext.ContextAttributes & { createWebGL2Context?: false },
): createContext.WebGLRenderingContext;

/**
 * @throws {Error} with the code `HEADLESS_GL_CONTEXT_CREATION_FAILED` if the context can't be created, for example when the ANGLE libraries can't be loaded.
 * @throws {RangeError} if `width` or `height` is less than 1.
 */
declare function createContext(
  width: number,
  height: number,
  options: createContext.ContextAttributes & { createWebGL2Context: true }
): createContext.WebGL2RenderingContext;

/**
 * @throws {Error} with the code `HEADLESS_GL_CONTEXT_CREATION_FAILED` if the context can't be created, for example when the ANGLE libraries can't be loaded.
 * @throws {RangeError} if `width` or `height` is less than 1.
 */
declare function createContext(
  width: number,
  height: number,
  options?: createContext.ContextAttributes
): createContext.WebGLRenderingContext | createContext.WebGL2RenderingContext;

export = createContext;
