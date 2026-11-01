function createContext (width, height, options) {
  width = width | 0
  height = height | 0
  if (!(width > 0 && height > 0)) {
    return null
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const contextType = options && options.createWebGL2Context ? 'webgl2' : 'webgl'
  /**
   * @type WebGLRenderingContext
   */
  const gl = canvas.getContext(contextType, options)

  const _getExtension = gl.getExtension
  const extDestroy = {
    destroy: function () {
      const loseContext = _getExtension.call(gl, 'WEBGL_lose_context')
      if (loseContext) {
        loseContext.loseContext()
      }
    }
  }

  const extResize = {
    resize: function (w, h) {
      canvas.width = w
      canvas.height = h
    }
  }

  const _supportedExtensions = gl.getSupportedExtensions().slice()
  _supportedExtensions.push(
    'STACKGL_destroy_context',
    'STACKGL_resize_drawingbuffer')
  gl.getSupportedExtensions = function () {
    return _supportedExtensions.slice()
  }

  gl.getExtension = function (extName) {
    const name = extName.toLowerCase()
    if (name === 'stackgl_resize_drawingbuffer') {
      return extResize
    }
    if (name === 'stackgl_destroy_context') {
      return extDestroy
    }
    return _getExtension.call(gl, extName)
  }

  return gl || null
}

module.exports = createContext
module.exports.WebGLRenderingContext = globalThis.WebGLRenderingContext
module.exports.WebGL2RenderingContext = globalThis.WebGL2RenderingContext
