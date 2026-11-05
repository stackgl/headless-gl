const BLOCKLIST = [
  // These expect the canvas to be cleared after compositing, which only a browser does.
  'canvas_buffer-offscreen-test',
  'canvas_buffer-preserve-test',
  // These draw a WebGL canvas into a 2D canvas, which gl-conformance's 2D canvas can't do.
  'canvas_draw-static-webgl-to-multiple-canvas-test',
  'canvas_draw-webgl-to-canvas-test'
]

require('./util/conformance')(function (str) {
  return str.indexOf('canvas') === 0 && BLOCKLIST.indexOf(str) < 0
})
