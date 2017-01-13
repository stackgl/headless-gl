'use strict'

function createContext (width, height, options) {
  width = width | 0
  height = height | 0
  if (!(width > 0 && height > 0)) {
    return null
  }

  var canvas = document.createElement('canvas')
  if (!canvas) {
    return null
  }
  var gl
  canvas.width = width
  canvas.height = height

  try {
    gl = canvas.getContext('webgl', options)
  } catch (e) {
    try {
      gl = canvas.getContext('experimental-webgl', options)
    } catch (e) {
      return null
    }
  }

  var _getExtension = gl.getExtension
  var extDestroy = {
    destroy: function () {
      var loseContext = _getExtension.call(gl, 'WEBGL_lose_context')
      if (loseContext) {
        loseContext.loseContext()
      }
    }
  }

  var extResize = {
    resize: function (w, h) {
      canvas.width = w
      canvas.height = h
    }
  }

  var _supportedExtensions = gl.getSupportedExtensions().slice()
  _supportedExtensions.push(
    'STACKGL_destroy_context',
    'STACKGL_resize_drawingbuffer')
  gl.getSupportedExtensions = function () {
    return _supportedExtensions.slice()
  }

  gl.getExtension = function (extName) {
    var name = extName.toLowerCase()
    if (name === 'stackgl_resize_drawingbuffer') {
      return extResize
    }
    if (name === 'stackgl_destroy_context') {
      return extDestroy
    }
    return _getExtension.call(gl, extName)
  }

  Object.defineProperty(gl, 'canvas', {
    get: function () {
      return null
    }
  })

  return gl || null
}

module.exports = createContext
