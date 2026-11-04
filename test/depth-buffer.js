'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawPixel = require('./util/draw-pixel')

for (const webgl2 of [false, true]) {
  tape(`depth-buffer: WebGL${webgl2 ? 2 : 1} drawing buffers have 24-bit depth`, function (t) {
    for (const stencil of [false, true]) {
      const gl = createContext(1, 1, { createWebGL2Context: webgl2, stencil })
      t.equal(gl.getParameter(gl.DEPTH_BITS), 24, `DEPTH_BITS is 24 ${stencil ? 'with' : 'without'} stencil, as in browsers`)

      // Mesa's llvmpipe loses 2 units of 32-bit depth, which is the smallest offset WebGL's conformance tests expect to work.
      gl.enable(gl.DEPTH_TEST)
      gl.depthFunc(gl.LEQUAL)
      gl.enable(gl.POLYGON_OFFSET_FILL)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      drawPixel(gl, 'void main() { gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0); }')
      gl.polygonOffset(0, 2)
      t.deepEqual(drawPixel(gl, 'void main() { gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0); }'), [0, 255, 0, 255], 'and polygon offset units of 2 put a polygon behind another at the same depth')
      t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

      gl.getExtension('STACKGL_destroy_context').destroy()
    }
    t.end()
  })
}
