/* globals __line */
var path = require('path')
var createContext = require('../../index')
var utils = require('../common/utils.js')
var utils_log = require('../common/utils_log.js')
var log = new utils_log.Log(path.basename(__filename), 'DEBUG')

function main () {
  // Create context
  var width = 512
  var height = 512
  var gl = createContext(width, height)

  var vertex_src = `
        attribute vec2 a_position;

        void main() {
          gl_Position = vec4(a_position, 0, 1);
        }
    `

  var fragment_src = `
        void main() {
          gl_FragColor = vec4(0, 1, 0, 1);  // green
        }
    `

  // setup a GLSL program
  var program = utils.createProgramFromSources(gl, [vertex_src, fragment_src])
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

  var files = [
    utils.replaceExt(__filename, '.jpg')
  ]

  for (var i = 0; i < files.length; i++) {
    var filename = files[i]
    log.info(__line, 'rendering ' + filename)
    utils.bufferToFile(gl, width, height, filename)
    log.info(__line, 'finished rendering ' + filename)
  }

  gl.destroy()
}

main()
