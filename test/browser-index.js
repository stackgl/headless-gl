'use strict'

const tape = require('tape')
const createContext = require('../src/javascript/browser-index')

// A stand-in for the DOM: each canvas's getContext calls createGL(type, options, canvas, listeners).
function withDocument (createGL, test) {
  global.document = {
    createElement: function () {
      const listeners = {}
      const canvas = {
        width: 300,
        height: 150,
        addEventListener: function (type, listener) {
          listeners[type] = listener
        },
        removeEventListener: function (type) {
          delete listeners[type]
        },
        getContext: function (type, options) {
          return createGL(type, options, canvas, listeners)
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

tape('browser: create context with an invalid size', function (t) {
  t.throws(() => createContext(0, 10), RangeError)
  t.throws(() => createContext(10, -1), RangeError)
  t.throws(() => createContext(NaN, 10), RangeError)
  t.end()
})

tape('browser: create context when the browser refuses', function (t) {
  withDocument(function (type, options, canvas, listeners) {
    listeners.webglcontextcreationerror({ statusMessage: 'WebGL is disabled.' })
    return null
  }, function () {
    try {
      createContext(10, 10)
      t.fail('should throw')
    } catch (error) {
      t.equal(error.code, 'HEADLESS_GL_CONTEXT_CREATION_FAILED')
      t.equal(error.message, 'Error creating WebGLContext: WebGL is disabled.')
    }
  })

  withDocument(function () {
    return null
  }, function () {
    t.throws(() => createContext(10, 10), /^Error: Error creating WebGLContext$/)
  })
  t.end()
})
