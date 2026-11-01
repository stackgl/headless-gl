'use strict'

const tape = require('tape')
const createContext = require('../src/javascript/browser-index')

// A stand-in for the DOM: each canvas's getContext calls createGL(type, options, canvas).
function withDocument (createGL, test) {
  global.document = {
    createElement: function () {
      const canvas = {
        width: 300,
        height: 150,
        getContext: function (type, options) {
          return createGL(type, options, canvas)
        }
      }
      return canvas
    }
  }
  try {
    test()
  } finally {
    delete global.document
  }
}

function fakeGL (type, canvas) {
  return {
    type,
    canvas,
    getExtension: function () {
      return null
    },
    getSupportedExtensions: function () {
      return ['OES_texture_float']
    }
  }
}

tape('browser: create context', function (t) {
  withDocument(function (type, options, canvas) {
    return fakeGL(type, canvas)
  }, function () {
    const gl = createContext(10, 20)
    t.equal(gl.type, 'webgl')
    t.equal(gl.canvas.width, 10)
    t.equal(gl.canvas.height, 20)
    t.deepEqual(gl.getSupportedExtensions(), ['OES_texture_float', 'STACKGL_destroy_context', 'STACKGL_resize_drawingbuffer'])
    gl.getExtension('STACKGL_resize_drawingbuffer').resize(30, 40)
    t.equal(gl.canvas.width, 30)
    t.equal(gl.canvas.height, 40)

    t.equal(createContext(10, 20, { createWebGL2Context: true }).type, 'webgl2')
  })
  t.end()
})
