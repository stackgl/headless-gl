'use strict'

const tape = require('tape')
const createContext = require('../index')

tape('resize', function (t) {
  const width = 2
  const height = 2
  const gl = createContext(width, height)

  function testColor (width, height, r, g, b, a) {
    gl.getExtension('STACKGL_resize_drawingbuffer').resize(width, height)

    t.equals(gl.drawingBufferWidth, width, 'width updated')
    t.equals(gl.drawingBufferHeight, height, 'height updated')

    gl.clearColor(r / 255, g / 255, b / 255, a / 255)
    gl.clear(gl.COLOR_BUFFER_BIT)

    const pixels = new Uint8Array((width + 2) * (height + 2) * 4)
    gl.readPixels(-1, -1, width + 2, height + 2, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

    let ptr = 0
    for (let row = -1; row <= height; ++row) {
      for (let col = -1; col <= width; ++col) {
        if (row < 0 || col < 0 || row === height || col === width) {
          t.equals(pixels[ptr++], 0, 'out of bounds red')
          t.equals(pixels[ptr++], 0, 'out of bounds green')
          t.equals(pixels[ptr++], 0, 'out of bounds blue')
          t.equals(pixels[ptr++], 0, 'out of bounds alpha')
        } else {
          t.equals(pixels[ptr++], r, 'in bounds red')
          t.equals(pixels[ptr++], g, 'in bounds green')
          t.equals(pixels[ptr++], b, 'in bounds blue')
          t.equals(pixels[ptr++], a, 'in bounds alpha')
        }
      }
    }
  }

  testColor(2, 2, 255, 255, 255, 255)
  testColor(4, 4, 255, 0, 255, 0)
  testColor(1, 1, 0, 255, 255, 255)

  gl.getExtension('STACKGL_destroy_context').destroy()

  t.end()
})

tape('resize: drawing buffers are no larger than the GPU allows', function (t) {
  const gl = createContext(1, 1)
  const maxSize = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE))
  const [maxViewportWidth, maxViewportHeight] = gl.getParameter(gl.MAX_VIEWPORT_DIMS)
  const maxWidth = Math.min(maxSize, maxViewportWidth)
  const maxHeight = Math.min(maxSize, maxViewportHeight)
  gl.getExtension('STACKGL_destroy_context').destroy()

  // Checks the drawing buffer's size, and that it works by clearing it and reading its far corner.
  function check (gl, width, height, description) {
    t.deepEqual([gl.drawingBufferWidth, gl.drawingBufferHeight], [width, height], description)
    gl.clearColor(0, 1, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    const pixel = new Uint8Array(4)
    gl.readPixels(width - 1, height - 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
    t.deepEqual([...pixel], [0, 255, 0, 255], 'and it can be drawn to')
    t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')
  }

  const wide = createContext(maxWidth + 32, 4)
  check(wide, maxWidth, 4, 'createContext makes a drawing buffer as wide as the GPU allows when asked for a wider one')
  t.deepEqual([...wide.getParameter(wide.VIEWPORT)], [0, 0, maxWidth, 4], 'and sets the viewport to its size')
  wide.getExtension('STACKGL_destroy_context').destroy()

  const tall = createContext(4, maxHeight + 32)
  check(tall, 4, maxHeight, 'and one as tall as the GPU allows when asked for a taller one')
  tall.getExtension('STACKGL_destroy_context').destroy()

  const resized = createContext(4, 4)
  resized.getExtension('STACKGL_resize_drawingbuffer').resize(maxWidth + 32, 4)
  check(resized, maxWidth, 4, 'resize does the same')
  resized.getExtension('STACKGL_destroy_context').destroy()

  t.end()
})
