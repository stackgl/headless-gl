var createContext = require('../index')
var utils = require('./utils')

function main () {
  // Create context
  var width = 64
  var height = 64
  var gl = createContext(width, height)

  var vertex_src = [
    'attribute vec2 a_position;',
    'void main() {',
    'gl_Position = vec4(a_position, 0, 1);',
    '}'
  ].join('\n')

  var fragment_src = [
    'void main() {',
    'gl_FragColor = vec4(0, 1, 0, 1);  // green',
    '}'
  ].join('\n')

  // setup a GLSL program
  var program = utils.createProgramFromSources(gl, [vertex_src, fragment_src])

  if (!program) {
    return
  }
  gl.useProgram(program)

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, 'a_position')

  // Create a buffer and put a single clipspace rectangle in
  // it (2 triangles)
  var buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1.0, -1.0,
      1.0, -1.0,
      -1.0, 1.0,
      -1.0, 1.0,
      1.0, -1.0,
      1.0, 1.0]),
    gl.STATIC_DRAW)
  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

  // draw
  gl.drawArrays(gl.TRIANGLES, 0, 6)

  utils.dumpBuffer(gl, width, height)

  gl.destroy()
}

main()
