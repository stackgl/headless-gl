var webgl = require('./webgl')

var privateMethods = [
  'resize',
  'destroy'
]

module.exports = function wrapContext (gl) {
  var props = Object.keys(gl).concat(Object.keys(gl.constructor.prototype))
  var wrapper = new WebGLRenderingContext()

  props.forEach(function (prop) {
    if (prop[0] === '_' ||
        prop[0] === '0' ||
        prop[0] === '1') {
      return
    }
    var value = gl[prop]
    if (typeof value === 'function') {
      if (privateMethods.indexOf(value) < 0) {
        wrapper[prop] = value.bind(gl)
      }
    } else {
      wrapper[prop] = value
    }
  })

  Object.defineProperties(wrapper, {
    drawingBufferWidth: {
      get: function () { return gl.drawingBufferWidth }
    },
    drawingBufferHeight: {
      get: function () { return gl.drawingBufferHeight }
    }
  })

  return wrapper
}

function WebGLRenderingContext () {}
module.exports.WebGLRenderingContext = WebGLRenderingContext

// FIXME: Wrap all these objects to prevent headless-gl stuff from leaking
module.exports.WebGLProgram = webgl.WebGLProgram
module.exports.WebGLShader = webgl.WebGLShader
module.exports.WebGLBuffer = webgl.WebGLBuffer
module.exports.WebGLFramebuffer = webgl.WebGLFramebuffer
module.exports.WebGLRenderbuffer = webgl.WebGLRenderbuffer
module.exports.WebGLTexture = webgl.WebGLTexture
module.exports.WebGLUniformLocation = webgl.WebGLUniformLocation
module.exports.WebGLActiveInfo = webgl.WebGLActiveInfo
module.exports.WebGLShaderPrecisionFormat = webgl.WebGLShaderPrecisionFormat
