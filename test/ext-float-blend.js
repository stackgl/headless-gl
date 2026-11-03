'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawTriangle = require('./util/draw-triangle')
const makeProgram = require('./util/make-program')

const shaders = {
  webgl1: [`attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`, `precision highp float;
void main() {
  gl_FragColor = vec4(0.5, -2.0, 3.0, 1.0);
}`],
  webgl2: [`#version 300 es
layout(location = 0) in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`, `#version 300 es
precision highp float;
out vec4 color;
void main() {
  color = vec4(0.5, -2.0, 3.0, 1.0);
}`]
}

// Clears a 32-bit float render target to 1, then draws (0.5, -2, 3, 1) onto it with additive blending.
function blend (gl, webgl2) {
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, webgl2 ? gl.RGBA32F : gl.RGBA, 1, 1, 0, gl.RGBA, gl.FLOAT, null)
  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
  gl.useProgram(makeProgram(gl, ...shaders[webgl2 ? 'webgl2' : 'webgl1']))
  gl.clearColor(1, 1, 1, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE)
  drawTriangle(gl)
  const error = gl.getError()
  const pixel = new Float32Array(4)
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, pixel)
  return { error, pixel: [...pixel] }
}

for (const webgl2 of [false, true]) {
  tape(`EXT_float_blend: WebGL${webgl2 ? 2 : 1}`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })
    const colorBufferExtension = webgl2 ? 'EXT_color_buffer_float' : 'OES_texture_float'
    gl.getExtension(colorBufferExtension)

    // As the EXT_float_blend spec requires, enabling the float color buffer extension enables it too.
    const result = blend(gl, webgl2)
    t.equal(result.error, gl.NO_ERROR, `blending works with only ${colorBufferExtension} enabled`)
    t.deepEqual(result.pixel, [1.5, -1, 4, 2], 'blends the values')
    t.ok(gl.getExtension('EXT_float_blend'), 'getExtension returns the extension')

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}
