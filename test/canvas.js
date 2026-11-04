const BLACKLIST = [
  // These expect the canvas to be cleared after compositing, which only a browser does.
  'canvas_buffer-offscreen-test',
  'canvas_buffer-preserve-test',
  // headless-gl's drawing buffers are at least 1×1.
  'canvas_canvas-zero-size',
  // These draw a WebGL canvas into a 2D canvas, which gl-conformance's 2D canvas can't do.
  'canvas_draw-static-webgl-to-multiple-canvas-test',
  'canvas_draw-webgl-to-canvas-test',
  // gl-conformance destroys the context before these finish.
  'canvas_framebuffer-bindings-unaffected-on-resize',
  'canvas_texture-bindings-unaffected-on-resize'
]

require('./util/conformance')(function (str) {
  return str.indexOf('canvas') === 0 && BLACKLIST.indexOf(str) < 0
})
