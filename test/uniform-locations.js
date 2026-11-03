'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawPixel = require('./util/draw-pixel')

const FRAGMENT_SHADERS = {
  webgl1: `precision mediump float;
uniform float h[3];
void main() {
  gl_FragColor = vec4(h[0], h[1], h[2], 1.0);
}`,
  webgl2: `#version 300 es
precision mediump float;
uniform float h[3];
out vec4 color;
void main() {
  color = vec4(h[0], h[1], h[2], 1.0);
}`
}

for (const webgl2 of [false, true]) {
  tape(`uniform locations: WebGL${webgl2 ? 2 : 1} array uniforms named without [0]`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })

    let location = null
    const pixel = drawPixel(gl, FRAGMENT_SHADERS[webgl2 ? 'webgl2' : 'webgl1'], program => {
      location = gl.getUniformLocation(program, 'h')
      t.ok(location, 'getUniformLocation returns a location for the array\'s name')
      gl.uniform1fv(location, [0.2, 0.4, 0.6])
      t.equal(gl.getError(), gl.NO_ERROR, 'and uniform1fv sets every element from it')
      t.ok(Math.abs(gl.getUniform(program, location) - 0.2) < 1e-6, 'getUniform reads the first element from it')
      t.ok(gl.getUniformLocation(program, 'h[0]'), 'the name with [0] still works')
    })
    t.deepEqual(pixel, [51, 102, 153, 255], 'the shader reads all three elements')

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}
