'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawTriangle = require('./util/draw-triangle')
const makeShader = require('./util/make-program')
const drawPixel = require('./util/draw-pixel')

tape('depth-buffer', function (t) {
  const width = 50
  const height = 50
  const gl = createContext(width, height)

  const vertexSrc = [
    'attribute vec2 position;',
    'uniform float depth;',
    'void main() { gl_Position = vec4(position,depth,1); }'
  ].join('\n')

  const fragmentSrc = [
    'precision mediump float;',
    'uniform vec4 color;',
    'void main() { gl_FragColor = color; }'
  ].join('\n')

  gl.clearColor(0, 0, 0, 0)
  gl.clearDepth(1)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  gl.enable(gl.DEPTH_TEST)
  gl.depthFunc(gl.NOTEQUAL)

  const program = makeShader(gl, vertexSrc, fragmentSrc)
  gl.useProgram(program)
  gl.uniform1f(gl.getUniformLocation(program, 'depth'), 0)
  gl.uniform4f(gl.getUniformLocation(program, 'color'), 1, 0, 0, 1)
  drawTriangle(gl)
  gl.uniform1f(gl.getUniformLocation(program, 'depth'), 1)
  gl.uniform4f(gl.getUniformLocation(program, 'color'), 0, 1, 0, 1)
  drawTriangle(gl)

  const pixels = new Uint8Array(width * height * 4)
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
  function checkPixels () {
    for (let i = 0; i < width * height * 4; i += 4) {
      if (pixels[i] !== 0 ||
          pixels[i + 1] !== 255 ||
          pixels[i + 2] !== 0 ||
          pixels[i + 3] !== 255) {
        return false
      }
    }
    return true
  }
  t.ok(checkPixels, 'pixels consistent')

  t.end()
})

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
