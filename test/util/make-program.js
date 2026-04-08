'use strict'

const compileShader = require('./make-shader')

module.exports = function setupShader (gl, VERT_SRC, FRAG_SRC) {
  const fragShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
  const vertShader = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC)

  const program = gl.createProgram()
  gl.attachShader(program, fragShader)
  gl.attachShader(program, vertShader)
  gl.linkProgram(program)

  return program
}
