'use strict'

const drawTriangle = require('./draw-triangle')
const makeProgram = require('./make-program')

const vertexShaders = {
  webgl1: `attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`,
  webgl2: `#version 300 es
layout(location = 0) in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`
}

// Draws over the whole drawing buffer with the fragment shader and returns the color of the first pixel.
// setup(program) runs once the program is in use, to set uniforms or attributes. Without a vertex shader, it uses one that passes attribute 0 through as the position, in GLSL ES 3.00 if the fragment shader is.
module.exports = function drawPixel (gl, fragmentShader, setup, vertexShader) {
  if (!vertexShader) {
    vertexShader = fragmentShader.startsWith('#version 300 es') ? vertexShaders.webgl2 : vertexShaders.webgl1
  }
  const program = makeProgram(gl, vertexShader, fragmentShader)
  gl.useProgram(program)
  if (setup) {
    setup(program)
  }
  drawTriangle(gl)
  const pixel = new Uint8Array(4)
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
  return [...pixel]
}
