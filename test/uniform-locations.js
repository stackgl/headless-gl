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

// Makes a fragment shader whose uniform's location is length characters long, in nested structures so that no identifier is anywhere near that long.
function longUniform (webgl2, length) {
  const outer = 'a'.repeat(Math.floor(length / 2))
  const inner = 'b'.repeat(Math.floor(length / 4))
  const member = 'c'.repeat(length - outer.length - inner.length - 2)
  const name = `${outer}.${inner}.${member}`
  const fragmentShader = `${webgl2 ? '#version 300 es\n' : ''}precision mediump float;
struct Inner { vec4 ${member}; };
struct Outer { Inner ${inner}; };
uniform Outer ${outer};
${webgl2 ? 'out vec4 color;\n' : ''}void main() {
  ${webgl2 ? 'color' : 'gl_FragColor'} = ${name};
}`
  return { name, fragmentShader }
}

for (const [webgl2, limit] of [[false, 256], [true, 1024]]) {
  tape(`uniform locations: WebGL${webgl2 ? 2 : 1} locations longer than ${limit} characters`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })

    const longest = longUniform(webgl2, limit)
    const pixel = drawPixel(gl, longest.fragmentShader, program => {
      t.equal(gl.getProgramParameter(program, gl.LINK_STATUS), true, `a program with a ${limit}-character uniform location links`)
      gl.uniform4f(gl.getUniformLocation(program, longest.name), 0.2, 0.4, 0.6, 1)
    })
    t.deepEqual(pixel, [51, 102, 153, 255], 'and getUniformLocation returns that location')

    const tooLong = longUniform(webgl2, limit + 1)
    drawPixel(gl, tooLong.fragmentShader, program => {
      t.equal(gl.getProgramParameter(program, gl.LINK_STATUS), true, 'so does a program with a location one character longer')
      t.equal(gl.getUniformLocation(program, tooLong.name), null, 'but getUniformLocation returns null for it')
      t.equal(gl.getError(), gl.INVALID_VALUE, 'and sets INVALID_VALUE')
    })
    t.equal(gl.getError(), gl.NO_ERROR, 'no other GL errors')

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}
