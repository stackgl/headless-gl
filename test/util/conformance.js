var tape = require('tape')
var runConformance = require('gl-conformance')
var createContext = require('../../index')

// Inject WebGL types into global namespaces, required by some conformance tests
var webgl = require('../../wrap')
WebGLRenderingContext = webgl.WebGLRenderingContext // eslint-disable-line
WebGLBuffer = webgl.WebGLBuffer // eslint-disable-line
WebGLFramebuffer = webgl.WebGLFramebuffer // eslint-disable-line
WebGLProgram = webgl.WebGLProgram // eslint-disable-line
WebGLRenderbuffer = webgl.WebGLRenderbuffer // eslint-disable-line
WebGLShader = webgl.WebGLShader // eslint-disable-line
WebGLTexture = webgl.WebGLTexture // eslint-disable-line
WebGLUniformLocation = webgl.WebGLUniformLocation // eslint-disable-line
WebGLActiveInfo = webgl.WebGLActiveInfo // eslint-disable-line
WebGLShaderPrecisionFormat = webgl.WebGLShaderPrecisionFormat // eslint-disable-line
WebGLContextAttributes = webgl.WebGLContextAttributes // eslint-disable-line

module.exports = function (filter) {
  return runConformance({
    tape: tape,
    createContext: function (width, height, options) {
      var context = createContext(width, height, options)
      context.destroy = context.getExtension('STACKGL_destroy_context').destroy
      context.resize = context.getExtension('STACKGL_resize_drawingbuffer').resize
      return context
    },
    filter: filter
  })
}
