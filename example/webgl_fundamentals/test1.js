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
        attribute vec2 a_position

        uniform vec2 u_resolution

        void main() {
            // convert the rectangle from pixels to 0.0 to 1.0
            vec2 zeroToOne = a_position / u_resolution

            // convert from 0->1 to 0->2
            vec2 zeroToTwo = zeroToOne * 2.0

            // convert from 0->2 to -1->+1 (clipspace)
            vec2 clipSpace = zeroToTwo - 1.0

            gl_Position = vec4(clipSpace, 0, 1)
        }
    `

  var fragment_src = `
        void main() {
            gl_FragColor = vec4(0, 1, 0, 1)  // green
        }
    `

  // setup a GLSL program
  var program = utils.createProgramFromSources(gl, [vertex_src, fragment_src])
  gl.useProgram(program)

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, 'a_position')

  // set the resolution
  var resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
  gl.uniform2f(resolutionLocation, width, height)

  // Create a buffer and put a single clipspace rectangle in
  // it (2 triangles)
  var buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    10, 20,
    80, 20,
    10, 30,
    10, 30,
    80, 20,
    80, 30
  ]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

  // draw
  gl.drawArrays(gl.TRIANGLES, 0, 6)

  var filename = __filename + '.ppm' // eslint-disable-line
  log.info(__line, 'rendering ' + filename)
  utils.bufferToFile(gl, width, height, filename)
  log.info(__line, 'finished rendering ' + filename)

  gl.destroy()
}

main()
