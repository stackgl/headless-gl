export class WebGLContextAttributes {
  alpha: boolean;
  depth: boolean;
  stencil: boolean;
  antialias: boolean;
  premultipliedAlpha: boolean;
  preserveDrawingBuffer: boolean;
  preferLowPowerToHighPerformance: boolean;
  failIfMajorPerformanceCaveat: boolean;
  createWebGL2Context: boolean;

  constructor(
    alpha: boolean,
    depth: boolean,
    stencil: boolean,
    antialias: boolean,
    premultipliedAlpha: boolean,
    preserveDrawingBuffer: boolean,
    preferLowPowerToHighPerformance: boolean,
    failIfMajorPerformanceCaveat: boolean,
    createWebGL2Context: boolean,
  ) {
    this.alpha = alpha;
    this.depth = depth;
    this.stencil = stencil;
    this.antialias = antialias;
    this.premultipliedAlpha = premultipliedAlpha;
    this.preserveDrawingBuffer = preserveDrawingBuffer;
    this.preferLowPowerToHighPerformance = preferLowPowerToHighPerformance;
    this.failIfMajorPerformanceCaveat = failIfMajorPerformanceCaveat;
    this.createWebGL2Context = createWebGL2Context;
  }
}
