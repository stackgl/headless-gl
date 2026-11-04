'use strict'

const tape = require('tape')
const createContext = require('../index')
const makeProgram = require('./util/make-program')

const FRAGMENT_SHADERS = {
  webgl1: `precision mediump float;
void main() {
  gl_FragColor = vec4(1.0);
}`,
  webgl2: `#version 300 es
precision mediump float;
out vec4 color;
void main() {
  color = vec4(1.0);
}`
}

for (const [webgl2, limit] of [[false, 256], [true, 1024]]) {
  tape(`attribute locations: WebGL${webgl2 ? 2 : 1} locations longer than ${limit} characters`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })

    const name = 'a'.repeat(limit)
    const vertexShader = webgl2
      ? `#version 300 es\nin vec4 ${name};\nvoid main() {\n  gl_Position = ${name};\n}`
      : `attribute vec4 ${name};\nvoid main() {\n  gl_Position = ${name};\n}`
    const program = makeProgram(gl, vertexShader, FRAGMENT_SHADERS[webgl2 ? 'webgl2' : 'webgl1'])
    t.equal(gl.getProgramParameter(program, gl.LINK_STATUS), true, `a program with a ${limit}-character attribute links`)
    gl.bindAttribLocation(program, 3, name)
    gl.linkProgram(program)
    t.equal(gl.getAttribLocation(program, name), 3, 'and bindAttribLocation and getAttribLocation take its name')
    t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

    gl.bindAttribLocation(program, 3, name + 'a')
    t.equal(gl.getError(), gl.INVALID_VALUE, 'bindAttribLocation sets INVALID_VALUE for a name one character longer')
    t.equal(gl.getAttribLocation(program, name + 'a'), -1, 'getAttribLocation returns -1 for it')
    t.equal(gl.getError(), gl.INVALID_VALUE, 'and sets INVALID_VALUE')

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}
