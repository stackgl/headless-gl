var createContext = require('../index')
var utils = require('./utils.js')

function main () {
  // Create context
  var width = 64
  var height = 64
  var gl = createContext(width, height)

  // Clear screen to red
  gl.clearColor(1.0, 0.0, 0.0, 1.0)
  gl.colorMask(true, true, true, true)
  gl.clear(gl.COLOR_BUFFER_BIT)

  utils.dumpBuffer(gl, width, height)

  gl.destroy()
}

main()
