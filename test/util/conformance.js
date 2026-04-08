const tape = require('tape')
const runConformance = require('@stackgl/gl-conformance')
const createContext = require('../../index')

// Inject WebGL types into global namespaces, required by some conformance tests
WebGLRenderingContext = require('../../src/javascript/webgl-rendering-context').WebGLRenderingContext // eslint-disable-line
WebGLBuffer = require('../../src/javascript/webgl-buffer').WebGLBuffer // eslint-disable-line
WebGLFramebuffer = require('../../src/javascript/webgl-framebuffer').WebGLFramebuffer // eslint-disable-line
WebGLProgram = require('../../src/javascript/webgl-program').WebGLProgram // eslint-disable-line
WebGLRenderbuffer = require('../../src/javascript/webgl-renderbuffer').WebGLRenderbuffer // eslint-disable-line
WebGLShader = require('../../src/javascript/webgl-shader').WebGLShader // eslint-disable-line
WebGLTexture = require('../../src/javascript/webgl-texture').WebGLTexture // eslint-disable-line
WebGLUniformLocation = require('../../src/javascript/webgl-uniform-location').WebGLUniformLocation // eslint-disable-line
WebGLActiveInfo = require('../../src/javascript/webgl-active-info').WebGLActiveInfo // eslint-disable-line
WebGLShaderPrecisionFormat = require('../../src/javascript/webgl-shader-precision-format').WebGLShaderPrecisionFormat // eslint-disable-line
WebGLContextAttributes = require('../../src/javascript/webgl-context-attributes').WebGLContextAttributes // eslint-disable-line

module.exports = function (filter) {
  return runConformance({
    tape,
    createContext: function (width, height, options) {
      const context = createContext(width, height, options)
      context.destroy = context.getExtension('STACKGL_destroy_context').destroy
      context.resize = context.getExtension('STACKGL_resize_drawingbuffer').resize
      return context
    },
    filter
  })
}
