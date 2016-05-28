'use strict'

var tape = require('tape')
var createContext = require('../index')

tape('clear color', function (t) {
  var width = 10
  var height = 10
  var gl = createContext(width, height)

  function testColor (r, g, b, a) {
    gl.clearColor(r / 255, g / 255, b / 255, a / 255)
    gl.clear(gl.COLOR_BUFFER_BIT)

    var pixels = new Uint8Array(width * height * 4)
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

    for (var i = 0; i < width * height * 4; i += 4) {
      if (pixels[i] !== r ||
          pixels[i + 1] !== g ||
          pixels[i + 2] !== b ||
          pixels[i + 3] !== a) {
        return false
      }
    }
    return true
  }

  t.ok(testColor(0, 0, 0, 0), 'black')
  t.ok(testColor(255, 255, 255, 255), 'white')
  t.ok(testColor(0, 255, 0, 255), 'green')
  t.ok(testColor(255, 0, 255, 0), 'magenta')

  gl.destroy()

  t.end()
})
