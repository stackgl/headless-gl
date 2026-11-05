class WebGLContextAttributes {
  constructor (
    alpha,
    depth,
    stencil,
    antialias,
    premultipliedAlpha,
    preserveDrawingBuffer,
    powerPreference,
    failIfMajorPerformanceCaveat,
    desynchronized,
    xrCompatible,
    createWebGL2Context) {
    this.alpha = alpha
    this.depth = depth
    this.stencil = stencil
    this.antialias = antialias
    this.premultipliedAlpha = premultipliedAlpha
    this.preserveDrawingBuffer = preserveDrawingBuffer
    this.powerPreference = powerPreference
    this.failIfMajorPerformanceCaveat = failIfMajorPerformanceCaveat
    this.desynchronized = desynchronized
    this.xrCompatible = xrCompatible
    this.createWebGL2Context = createWebGL2Context
  }
}

module.exports = { WebGLContextAttributes }
