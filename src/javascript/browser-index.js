function createContext (width, height, options) {
  if (!((width | 0) > 0 && (height | 0) > 0)) {
    throw new RangeError(`Error creating WebGLContext: width and height must be at least 1, got ${width} and ${height}.`)
  }
  width = width | 0
  height = height | 0

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  // The browser reports why it couldn't create a context in this event, which fires before getContext returns null.
  let statusMessage = ''
  const onCreationError = function (event) {
    statusMessage = event.statusMessage
  }
  canvas.addEventListener('webglcontextcreationerror', onCreationError)
  const contextType = options && options.createWebGL2Context ? 'webgl2' : 'webgl'
  /**
   * @type WebGLRenderingContext
   */
  const gl = canvas.getContext(contextType, options)
  canvas.removeEventListener('webglcontextcreationerror', onCreationError)

  if (!gl) {
    const error = new Error(statusMessage ? `Error creating WebGLContext: ${statusMessage}` : 'Error creating WebGLContext')
    error.code = 'HEADLESS_GL_CONTEXT_CREATION_FAILED'
    throw error
  }

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

  return gl
}

module.exports = createContext
module.exports.WebGLRenderingContext = globalThis.WebGLRenderingContext
module.exports.WebGL2RenderingContext = globalThis.WebGL2RenderingContext
