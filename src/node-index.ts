// eslint-disable-next-line @typescript-eslint/no-require-imports
const bits = require('bit-twiddle') as {
  log2: (n: number) => number;
  nextPow2: (n: number) => number;
};
import { WebGLContextAttributes } from './webgl-context-attributes';
import {
  WebGLRenderingContext,
  WebGL2RenderingContext,
  wrapContext,
} from './webgl-rendering-context';
import { WebGLTextureUnit } from './webgl-texture-unit';
import {
  WebGLVertexArrayObjectState,
  WebGLVertexArrayGlobalState,
} from './webgl-vertex-attribute';

let CONTEXT_COUNTER = 0;

function flag(
  options: Record<string, any> | null | undefined,
  name: string,
  dflt: boolean,
): boolean {
  if (!options || !(typeof options === 'object') || !(name in options)) {
    return dflt;
  }
  return !!options[name];
}

export function createContext(
  width: number,
  height: number,
  options?: Record<string, any>,
): any {
  width = width | 0;
  height = height | 0;
  if (!(width > 0 && height > 0)) return null;

  const contextAttributes = new WebGLContextAttributes(
    flag(options, 'alpha', true),
    flag(options, 'depth', true),
    flag(options, 'stencil', false),
    false,
    flag(options, 'premultipliedAlpha', true),
    flag(options, 'preserveDrawingBuffer', false),
    flag(options, 'preferLowPowerToHighPerformance', false),
    flag(options, 'failIfMajorPerformanceCaveat', false),
    flag(options, 'createWebGL2Context', false),
  );

  contextAttributes.premultipliedAlpha =
    contextAttributes.premultipliedAlpha && contextAttributes.alpha;

  const WebGLContext = contextAttributes.createWebGL2Context
    ? WebGL2RenderingContext
    : WebGLRenderingContext;

  let ctx: any;
  try {
    const AnyWebGLContext = WebGLContext as any;
    ctx = new AnyWebGLContext(
      1,
      1,
      contextAttributes.alpha,
      contextAttributes.depth,
      contextAttributes.stencil,
      contextAttributes.antialias,
      contextAttributes.premultipliedAlpha,
      contextAttributes.preserveDrawingBuffer,
      contextAttributes.preferLowPowerToHighPerformance,
      contextAttributes.failIfMajorPerformanceCaveat,
      contextAttributes.createWebGL2Context,
    );
  } catch {}

  if (!ctx) return null;

  ctx.drawingBufferWidth = width;
  ctx.drawingBufferHeight = height;
  ctx._ = CONTEXT_COUNTER++;
  ctx._contextAttributes = contextAttributes;
  ctx._extensions = {};
  ctx._programs = {};
  ctx._shaders = {};
  ctx._buffers = {};
  ctx._textures = {};
  ctx._framebuffers = {};
  ctx._renderbuffers = {};
  ctx._activeProgram = null;
  ctx._activeFramebuffers = { read: null, draw: null };
  ctx._activeRenderbuffer = null;
  ctx._checkStencil = false;
  ctx._stencilState = true;

  if (contextAttributes.createWebGL2Context) {
    ctx._vaos = {};
    ctx._activeVertexArrayObject = null;
  }

  const numTextures = ctx.getParameter(ctx.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
  ctx._textureUnits = new Array(numTextures);
  for (let i = 0; i < numTextures; ++i) {
    ctx._textureUnits[i] = new WebGLTextureUnit(ctx, i);
  }
  ctx._activeTextureUnit = 0;
  ctx.activeTexture(ctx.TEXTURE0);

  ctx._errorStack = [];

  ctx._defaultVertexObjectState = new WebGLVertexArrayObjectState(ctx);
  ctx._vertexObjectState = ctx._defaultVertexObjectState;
  ctx._vertexGlobalState = new WebGLVertexArrayGlobalState(ctx);

  ctx._maxTextureSize = ctx.getParameter(ctx.MAX_TEXTURE_SIZE);
  ctx._maxTextureLevel = bits.log2(bits.nextPow2(ctx._maxTextureSize));
  ctx._maxCubeMapSize = ctx.getParameter(ctx.MAX_CUBE_MAP_TEXTURE_SIZE);
  ctx._maxCubeMapLevel = bits.log2(bits.nextPow2(ctx._maxCubeMapSize));

  ctx._unpackAlignment = 4;
  ctx._packAlignment = 4;

  ctx._allocateDrawingBuffer(width, height);

  const attrib0Buffer = ctx.createBuffer();
  ctx._attrib0Buffer = attrib0Buffer;

  ctx.bindBuffer(ctx.ARRAY_BUFFER, null);
  ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, null);
  ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
  ctx.bindRenderbuffer(ctx.RENDERBUFFER, null);

  ctx.viewport(0, 0, width, height);
  ctx.scissor(0, 0, width, height);

  ctx.clearDepth(1);
  ctx.clearColor(0, 0, 0, 0);
  ctx.clearStencil(0);
  ctx.clear(
    ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT | ctx.STENCIL_BUFFER_BIT,
  );

  return wrapContext(ctx);
}
