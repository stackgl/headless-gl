const HEADLESS_VERSION = require('../../package.json').version
const { gl, NativeWebGLRenderingContext, NativeWebGL } = require('./native-gl')
const { getANGLEInstancedArrays } = require('./extensions/angle-instanced-arrays')
const { getOESElementIndexUint } = require('./extensions/oes-element-index-unit')
const { getOESStandardDerivatives } = require('./extensions/oes-standard-derivatives')
const { getOESTextureFloat } = require('./extensions/oes-texture-float')
const { getOESTextureFloatLinear } = require('./extensions/oes-texture-float-linear')
const { getSTACKGLDestroyContext } = require('./extensions/stackgl-destroy-context')
const { getSTACKGLResizeDrawingBuffer } = require('./extensions/stackgl-resize-drawing-buffer')
const { getWebGLDrawBuffers } = require('./extensions/webgl-draw-buffers')
const { getEXTBlendMinMax } = require('./extensions/ext-blend-minmax')
const { getEXTTextureFilterAnisotropic } = require('./extensions/ext-texture-filter-anisotropic')
const { getEXTShaderTextureLod } = require('./extensions/ext-shader-texture-lod')
const { getOESVertexArrayObject } = require('./extensions/oes-vertex-array-object')
const {
  bindPublics,
  checkObject,
  checkUniform,
  isValidString,
  typeSize,
  uniformTypeSize,
  extractImageData,
  isTypedArray,
  unpackTypedArray,
  convertPixels,
  validCubeTarget
} = require('./utils')

const { WebGLActiveInfo } = require('./webgl-active-info')
const { WebGLFramebuffer } = require('./webgl-framebuffer')
const { WebGLBuffer } = require('./webgl-buffer')
const { WebGLDrawingBufferWrapper } = require('./webgl-drawing-buffer-wrapper')
const { WebGLProgram } = require('./webgl-program')
const { WebGLRenderbuffer } = require('./webgl-renderbuffer')
const { WebGLShader } = require('./webgl-shader')
const { WebGLShaderPrecisionFormat } = require('./webgl-shader-precision-format')
const { WebGLTexture } = require('./webgl-texture')
const { WebGLUniformLocation } = require('./webgl-uniform-location')
const { WebGLVertexArrayObject } = require('./webgl-vertex-array-object')
const { getEXTColorBufferFloat } = require('./extensions/ext-color-buffer-float')

// These are defined by the WebGL spec
const MAX_UNIFORM_LENGTH = 256
const MAX_ATTRIBUTE_LENGTH = 256

const DEFAULT_ATTACHMENTS = [
  gl.COLOR_ATTACHMENT0,
  gl.DEPTH_ATTACHMENT,
  gl.STENCIL_ATTACHMENT,
  gl.DEPTH_STENCIL_ATTACHMENT
]

const DEFAULT_COLOR_ATTACHMENTS = [gl.COLOR_ATTACHMENT0]

const availableExtensions = {
  angle_instanced_arrays: getANGLEInstancedArrays,
  oes_element_index_uint: getOESElementIndexUint,
  oes_texture_float: getOESTextureFloat,
  oes_texture_float_linear: getOESTextureFloatLinear,
  oes_standard_derivatives: getOESStandardDerivatives,
  oes_vertex_array_object: getOESVertexArrayObject,
  stackgl_destroy_context: getSTACKGLDestroyContext,
  stackgl_resize_drawingbuffer: getSTACKGLResizeDrawingBuffer,
  webgl_draw_buffers: getWebGLDrawBuffers,
  ext_blend_minmax: getEXTBlendMinMax,
  ext_texture_filter_anisotropic: getEXTTextureFilterAnisotropic,
  ext_shader_texture_lod: getEXTShaderTextureLod,
  ext_color_buffer_float: getEXTColorBufferFloat
}

const privateMethods = [
  'constructor',
  'resize',
  'destroy'
]

function wrapContext (ctx) {
  const isWebGL2 = ctx.constructor.name === 'WebGL2RenderingContext'
  const wrapper = isWebGL2 ? new WebGL2RenderingContext() : new WebGLRenderingContext()

  let proto = ctx
  while (proto && proto !== Object.prototype) {
    bindPublics(Object.keys(proto), wrapper, ctx, privateMethods)
    bindPublics(Object.keys(proto.constructor.prototype), wrapper, ctx, privateMethods)
    bindPublics(Object.getOwnPropertyNames(proto), wrapper, ctx, privateMethods)
    bindPublics(Object.getOwnPropertyNames(proto.constructor.prototype), wrapper, ctx, privateMethods)
    proto = Object.getPrototypeOf(proto)
  }

  Object.defineProperties(wrapper, {
    drawingBufferWidth: {
      get () { return ctx.drawingBufferWidth },
      set (value) { ctx.drawingBufferWidth = value }
    },
    drawingBufferHeight: {
      get () { return ctx.drawingBufferHeight },
      set (value) { ctx.drawingBufferHeight = value }
    }
  })

  return wrapper
}

// We need to wrap some of the native WebGL functions to handle certain error codes and check input values
class WebGLRenderingContextHelper extends NativeWebGLRenderingContext {
  _checkLocation (location) {
    if (!(location instanceof WebGLUniformLocation)) {
      this.setError(this.INVALID_VALUE)
      return false
    } else if (location._program._ctx !== this ||
      location._linkCount !== location._program._linkCount) {
      this.setError(this.INVALID_OPERATION)
      return false
    }
    return true
  }

  _checkLocationActive (location) {
    if (!location) {
      return false
    } else if (!this._checkLocation(location)) {
      return false
    } else if (location._program !== this._activeProgram) {
      this.setError(this.INVALID_OPERATION)
      return false
    }
    return true
  }

  _checkOwns (object) {
    return typeof object === 'object' &&
      object._ctx === this
  }

  _checkShaderSource (shader) {
    return true
  }

  _checkTextureTarget (target) {
    const unit = this._getActiveTextureUnit()
    let tex = null
    if (target === this.TEXTURE_2D) {
      tex = unit._bind2D
    } else if (target === this.TEXTURE_CUBE_MAP) {
      tex = unit._bindCube
    } else if (this._isWebGL2() && target === this.TEXTURE_3D) {
      tex = unit._bind3D
    } else if (this._isWebGL2() && target === this.TEXTURE_2D_ARRAY) {
      tex = unit._bind2DArray
    } else {
      this.setError(this.INVALID_ENUM)
      return false
    }
    if (!tex) {
      this.setError(this.INVALID_OPERATION)
      return false
    }
    return true
  }

  _checkWrapper (object, Wrapper) {
    if (!this._checkValid(object, Wrapper)) {
      this.setError(this.INVALID_VALUE)
      return false
    } else if (!this._checkOwns(object)) {
      this.setError(this.INVALID_OPERATION)
      return false
    }
    return true
  }

  _checkValid (object, Type) {
    return object instanceof Type && object._ !== 0
  }

  _checkVertexIndex (index) {
    if (index < 0 || index >= this._vertexObjectState._attribs.length) {
      this.setError(this.INVALID_VALUE)
      return false
    }
    return true
  }

  _fixupLink (program) {
    if (!super.getProgramParameter(program._, this.LINK_STATUS)) {
      program._linkInfoLog = super.getProgramInfoLog(program._)
      return false
    }

    // Record attribute attributeLocations
    const numAttribs = this.getProgramParameter(program, this.ACTIVE_ATTRIBUTES)
    const names = new Array(numAttribs)
    program._attributes.length = numAttribs
    for (let i = 0; i < numAttribs; ++i) {
      names[i] = this.getActiveAttrib(program, i).name
      program._attributes[i] = this.getAttribLocation(program, names[i]) | 0
    }

    // Check attribute names
    for (let i = 0; i < names.length; ++i) {
      if (names[i].length > MAX_ATTRIBUTE_LENGTH) {
        program._linkInfoLog = 'attribute ' + names[i] + ' is too long'
        return false
      }
    }

    for (let i = 0; i < numAttribs; ++i) {
      super.bindAttribLocation(
        program._ | 0,
        program._attributes[i],
        names[i])
    }

    super.linkProgram(program._ | 0)

    const numUniforms = this.getProgramParameter(program, this.ACTIVE_UNIFORMS)
    program._uniforms.length = numUniforms
    for (let i = 0; i < numUniforms; ++i) {
      program._uniforms[i] = this.getActiveUniform(program, i)
    }

    // Check attribute and uniform name lengths
    for (let i = 0; i < program._uniforms.length; ++i) {
      if (program._uniforms[i].name.length > MAX_UNIFORM_LENGTH) {
        program._linkInfoLog = 'uniform ' + program._uniforms[i].name + ' is too long'
        return false
      }
    }

    program._linkInfoLog = ''
    return true
  }

  _framebufferOk () {
    return true
  }

  _getActiveBuffer (target) {
    if (target === this.ARRAY_BUFFER) {
      return this._vertexGlobalState._arrayBufferBinding
    } else if (target === this.ELEMENT_ARRAY_BUFFER) {
      return this._vertexObjectState._elementArrayBufferBinding
    }
    return null
  }

  _getActiveTextureUnit () {
    return this._textureUnits[this._activeTextureUnit]
  }

  _getActiveTexture (target) {
    const activeUnit = this._getActiveTextureUnit()
    if (target === this.TEXTURE_2D) {
      return activeUnit._bind2D
    } else if (target === this.TEXTURE_CUBE_MAP) {
      return activeUnit._bindCube
    } else if (this._isWebGL2() && target === this.TEXTURE_2D_ARRAY) {
      return activeUnit._bind2DArray
    } else if (this._isWebGL2() && target === this.TEXTURE_3D) {
      return activeUnit._bind3D
    }
    return null
  }

  _getActiveFramebuffer (target) {
    if (target === this.READ_FRAMEBUFFER) {
      return this._activeFramebuffers.read
    } else {
      return this._activeFramebuffers.draw
    }
  }

  _getAttachments () {
    return this._extensions.webgl_draw_buffers ? this._extensions.webgl_draw_buffers._ALL_ATTACHMENTS : DEFAULT_ATTACHMENTS
  }

  _getColorAttachments () {
    return this._extensions.webgl_draw_buffers ? this._extensions.webgl_draw_buffers._ALL_COLOR_ATTACHMENTS : DEFAULT_COLOR_ATTACHMENTS
  }

  _getParameterDirect (pname) {
    return super.getParameter(pname)
  }

  _getTexImage (target) {
    const unit = this._getActiveTextureUnit()
    if (target === this.TEXTURE_2D) {
      return unit._bind2D
    } else if (validCubeTarget(target)) {
      return unit._bindCube
    }
    this.setError(this.INVALID_ENUM)
    return null
  }

  _isConstantColorBlendFunc (factor) {
    return (
      factor === this.CONSTANT_COLOR ||
      factor === this.ONE_MINUS_CONSTANT_COLOR
    )
  }

  _isConstantAlphaBlendFunc (factor) {
    return (
      factor === this.CONSTANT_ALPHA ||
      factor === this.ONE_MINUS_CONSTANT_ALPHA
    )
  }

  _isObject (object, method, Wrapper) {
    if (!(object === null || object === undefined) &&
      !(object instanceof Wrapper)) {
      throw new TypeError(method + '(' + Wrapper.name + ')')
    }
    if (this._checkValid(object, Wrapper) && this._checkOwns(object)) {
      return true
    }
    return false
  }

  _resizeDrawingBuffer (width, height) {
    const prevFramebuffer = this._activeFramebuffers.draw
    const prevTexture = this._getActiveTexture(this.TEXTURE_2D)
    const prevRenderbuffer = this._activeRenderbuffer

    const contextAttributes = this._contextAttributes

    const drawingBuffer = this._drawingBuffer
    super.bindFramebuffer(this.FRAMEBUFFER, drawingBuffer._framebuffer)
    const attachments = this._getAttachments()
    // Clear all attachments
    for (let i = 0; i < attachments.length; ++i) {
      super.framebufferTexture2D(
        this.FRAMEBUFFER,
        attachments[i],
        this.TEXTURE_2D,
        0,
        0)
    }

    // Update color attachment
    super.bindTexture(this.TEXTURE_2D, drawingBuffer._color)
    const colorFormat = contextAttributes.alpha ? this.RGBA : this.RGB
    super.texImage2D(
      this.TEXTURE_2D,
      0,
      colorFormat,
      width,
      height,
      0,
      colorFormat,
      this.UNSIGNED_BYTE,
      null)
    super.texParameteri(this.TEXTURE_2D, this.TEXTURE_MIN_FILTER, this.NEAREST)
    super.texParameteri(this.TEXTURE_2D, this.TEXTURE_MAG_FILTER, this.NEAREST)
    super.framebufferTexture2D(
      this.FRAMEBUFFER,
      this.COLOR_ATTACHMENT0,
      this.TEXTURE_2D,
      drawingBuffer._color,
      0)

    // Update depth-stencil attachments if needed
    let storage = 0
    let attachment = 0
    if (contextAttributes.depth && contextAttributes.stencil) {
      storage = this.DEPTH_STENCIL
      attachment = this.DEPTH_STENCIL_ATTACHMENT
    } else if (contextAttributes.depth) {
      storage = 0x81A7
      attachment = this.DEPTH_ATTACHMENT
    } else if (contextAttributes.stencil) {
      storage = this.STENCIL_INDEX8
      attachment = this.STENCIL_ATTACHMENT
    }

    if (storage) {
      super.bindRenderbuffer(
        this.RENDERBUFFER,
        drawingBuffer._depthStencil)
      super.renderbufferStorage(
        this.RENDERBUFFER,
        storage,
        width,
        height)
      super.framebufferRenderbuffer(
        this.FRAMEBUFFER,
        attachment,
        this.RENDERBUFFER,
        drawingBuffer._depthStencil)
    }

    // Restore previous binding state
    this.bindFramebuffer(this.FRAMEBUFFER, prevFramebuffer)
    this.bindTexture(this.TEXTURE_2D, prevTexture)
    this.bindRenderbuffer(this.RENDERBUFFER, prevRenderbuffer)
  }

  _restoreError (lastError) {
    const topError = this._errorStack.pop()
    if (topError === this.NO_ERROR) {
      this.setError(lastError)
    } else {
      this.setError(topError)
    }
  }

  _saveError () {
    this._errorStack.push(this.getError())
  }

  _switchActiveProgram (active) {
    if (active) {
      active._refCount -= 1
      active._checkDelete()
    }
  }

  _validBlendFunc (factor) {
    return factor === this.ZERO ||
      factor === this.ONE ||
      factor === this.SRC_COLOR ||
      factor === this.ONE_MINUS_SRC_COLOR ||
      factor === this.DST_COLOR ||
      factor === this.ONE_MINUS_DST_COLOR ||
      factor === this.SRC_ALPHA ||
      factor === this.ONE_MINUS_SRC_ALPHA ||
      factor === this.DST_ALPHA ||
      factor === this.ONE_MINUS_DST_ALPHA ||
      factor === this.SRC_ALPHA_SATURATE ||
      factor === this.CONSTANT_COLOR ||
      factor === this.ONE_MINUS_CONSTANT_COLOR ||
      factor === this.CONSTANT_ALPHA ||
      factor === this.ONE_MINUS_CONSTANT_ALPHA
  }

  _validBlendMode (mode) {
    return mode === this.FUNC_ADD ||
      mode === this.FUNC_SUBTRACT ||
      mode === this.FUNC_REVERSE_SUBTRACT ||
      (this._extensions.ext_blend_minmax && (
        mode === this._extensions.ext_blend_minmax.MIN_EXT ||
        mode === this._extensions.ext_blend_minmax.MAX_EXT))
  }

  _validCubeTarget (target) {
    return target === this.TEXTURE_CUBE_MAP_POSITIVE_X ||
      target === this.TEXTURE_CUBE_MAP_NEGATIVE_X ||
      target === this.TEXTURE_CUBE_MAP_POSITIVE_Y ||
      target === this.TEXTURE_CUBE_MAP_NEGATIVE_Y ||
      target === this.TEXTURE_CUBE_MAP_POSITIVE_Z ||
      target === this.TEXTURE_CUBE_MAP_NEGATIVE_Z
  }

  _validFramebufferAttachment (attachment) {
    switch (attachment) {
      case this.DEPTH_ATTACHMENT:
      case this.STENCIL_ATTACHMENT:
      case this.DEPTH_STENCIL_ATTACHMENT:
      case this.COLOR_ATTACHMENT0:
        return true
    }

    if (this._extensions.webgl_draw_buffers) { // eslint-disable-line
      const { webgl_draw_buffers } = this._extensions; // eslint-disable-line
      return attachment < (webgl_draw_buffers.COLOR_ATTACHMENT0_WEBGL + webgl_draw_buffers._maxDrawBuffers) // eslint-disable-line
    }

    return false
  }

  _validGLSLIdentifier (str) {
    return !(str.indexOf('webgl_') === 0 ||
      str.indexOf('_webgl_') === 0 ||
      str.length > 256)
  }

  _validTextureTarget (target) {
    return target === this.TEXTURE_2D ||
      target === this.TEXTURE_CUBE_MAP
  }

  _verifyTextureCompleteness (target, pname, param) {
    const unit = this._getActiveTextureUnit()
    let texture = null
    if (target === this.TEXTURE_2D) {
      texture = unit._bind2D
    } else if (this._validCubeTarget(target)) {
      texture = unit._bindCube
    }

    // oes_texture_float but not oes_texture_float_linear
    if (this._extensions.oes_texture_float && !this._extensions.oes_texture_float_linear && texture && texture._type === this.FLOAT && (pname === this.TEXTURE_MAG_FILTER || pname === this.TEXTURE_MIN_FILTER) && (param === this.LINEAR || param === this.LINEAR_MIPMAP_NEAREST || param === this.NEAREST_MIPMAP_LINEAR || param === this.LINEAR_MIPMAP_LINEAR)) {
      texture._complete = false
      this.bindTexture(target, texture)
      return
    }

    if (texture && texture._complete === false) {
      texture._complete = true
      this.bindTexture(target, texture)
    }
  }

  _wrapShader (type, source) {
    return source
  }

  activeTexture (texture) {
    texture |= 0
    const texNum = texture - this.TEXTURE0
    if (texNum >= 0 && texNum < this._textureUnits.length) {
      this._activeTextureUnit = texNum
      return super.activeTexture(texture)
    }

    this.setError(this.INVALID_ENUM)
  }

  attachShader (program, shader) {
    if (!checkObject(program) ||
      !checkObject(shader)) {
      throw new TypeError('attachShader(WebGLProgram, WebGLShader)')
    }
    if (!program || !shader) {
      this.setError(this.INVALID_VALUE)
      return
    } else if (program instanceof WebGLProgram &&
      shader instanceof WebGLShader &&
      this._checkOwns(program) &&
      this._checkOwns(shader)) {
      if (!program._linked(shader)) {
        this._saveError()
        super.attachShader(
          program._ | 0,
          shader._ | 0)
        const error = this.getError()
        this._restoreError(error)
        if (error === this.NO_ERROR) {
          program._link(shader)
        }
        return
      }
    }
    this.setError(this.INVALID_OPERATION)
  }

  bindAttribLocation (program, index, name) {
    if (!checkObject(program) ||
      typeof name !== 'string') {
      throw new TypeError('bindAttribLocation(WebGLProgram, GLint, String)')
    }
    name += ''
    if (!isValidString(name) || name.length > MAX_ATTRIBUTE_LENGTH) {
      this.setError(this.INVALID_VALUE)
    } else if (/^_?webgl_a/.test(name)) {
      this.setError(this.INVALID_OPERATION)
    } else if (this._checkWrapper(program, WebGLProgram)) {
      return super.bindAttribLocation(
        program._ | 0,
        index | 0,
        name)
    }
  }

  bindFramebuffer (target, framebuffer) {
    if (!checkObject(framebuffer)) {
      throw new TypeError('bindFramebuffer(GLenum, WebGLFramebuffer)')
    }
    let error = 0
    if (!framebuffer) {
      this._saveError()
      super.bindFramebuffer(
        target,
        this._drawingBuffer._framebuffer)
      error = super.getError()
      this._restoreError(error)
    } else if (framebuffer._pendingDelete) {
      return
    } else if (this._checkWrapper(framebuffer, WebGLFramebuffer)) {
      this._saveError()
      super.bindFramebuffer(
        target,
        framebuffer._ | 0)
      error = super.getError()
      this._restoreError(error)
    } else {
      return
    }

    if (target === this.FRAMEBUFFER) {
      this._activeFramebuffers.draw = framebuffer
      this._activeFramebuffers.read = framebuffer
    } else if (target === this.READ_FRAMEBUFFER) {
      this._activeFramebuffers.read = framebuffer
    } else if (target === this.DRAW_FRAMEBUFFER) {
      this._activeFramebuffers.draw = framebuffer
    }
  }

  bindBuffer (target, buffer) {
    target |= 0
    if (!checkObject(buffer)) {
      throw new TypeError('bindBuffer(GLenum, WebGLBuffer)')
    }
    if (target !== this.ARRAY_BUFFER &&
      target !== this.ELEMENT_ARRAY_BUFFER) {
      this.setError(this.INVALID_ENUM)
      return
    }

    if (!buffer) {
      buffer = null
      super.bindBuffer(target, 0)
    } else if (buffer._pendingDelete) {
      return
    } else if (this._checkWrapper(buffer, WebGLBuffer)) {
      if (buffer._binding && buffer._binding !== target) {
        this.setError(this.INVALID_OPERATION)
        return
      }
      buffer._binding = target | 0

      super.bindBuffer(target, buffer._ | 0)
    } else {
      return
    }

    if (target === this.ARRAY_BUFFER) {
      // Buffers of type ARRAY_BUFFER are bound to the global vertex state.
      this._vertexGlobalState.setArrayBuffer(buffer)
    } else {
      // Buffers of type ELEMENT_ARRAY_BUFFER are bound to vertex array object state.
      this._vertexObjectState.setElementArrayBuffer(buffer)
    }
  }

  bindRenderbuffer (target, object) {
    if (!checkObject(object)) {
      throw new TypeError('bindRenderbuffer(GLenum, WebGLRenderbuffer)')
    }

    if (target !== this.RENDERBUFFER) {
      this.setError(this.INVALID_ENUM)
      return
    }

    if (!object) {
      super.bindRenderbuffer(
        target | 0,
        0)
    } else if (object._pendingDelete) {
      return
    } else if (this._checkWrapper(object, WebGLRenderbuffer)) {
      super.bindRenderbuffer(
        target | 0,
        object._ | 0)
    } else {
      return
    }
    const active = this._activeRenderbuffer
    if (active !== object) {
      if (active) {
        active._refCount -= 1
        active._checkDelete()
      }
      if (object) {
        object._refCount += 1
      }
    }
    this._activeRenderbuffer = object
  }

  bindTexture (target, texture) {
    target |= 0

    if (!checkObject(texture)) {
      throw new TypeError('bindTexture(GLenum, WebGLTexture)')
    }

    // Get texture id
    let textureId = 0
    if (!texture) {
      texture = null
    } else if (texture instanceof WebGLTexture &&
      texture._pendingDelete) {
      // Special case: error codes for deleted textures don't get set for some dumb reason
      return
    } else if (this._checkWrapper(texture, WebGLTexture)) {
      texture._binding = target
      textureId = texture._ | 0
    } else {
      return
    }

    this._saveError()
    super.bindTexture(
      target,
      textureId)
    const error = this.getError()
    this._restoreError(error)

    if (error !== this.NO_ERROR) {
      return
    }

    const activeUnit = this._getActiveTextureUnit()
    const activeTex = this._getActiveTexture(target)

    // Update references
    if (activeTex !== texture) {
      if (activeTex) {
        activeTex._refCount -= 1
        activeTex._checkDelete()
      }
      if (texture) {
        texture._refCount += 1
      }
    }

    if (target === this.TEXTURE_2D) {
      activeUnit._bind2D = texture
    } else if (target === this.TEXTURE_CUBE_MAP) {
      activeUnit._bindCube = texture
    } else if (this._isWebGL2() && target === this.TEXTURE_2D_ARRAY) {
      activeUnit._bind2DArray = texture
    } else if (this._isWebGL2() && target === this.TEXTURE_3D) {
      activeUnit._bind3D = texture
    }
  }

  bindVertexArray (array) {
    if (!checkObject(array)) {
      throw new TypeError('bindVertexArray(WebGLVertexArrayObject)')
    }

    if (!array) {
      array = null
      super.bindVertexArray(null)
    } else if (array instanceof WebGLVertexArrayObject &&
      array._pendingDelete) {
      this.setError(gl.INVALID_OPERATION)
      return
    } else if (this._checkWrapper(array, WebGLVertexArrayObject)) {
      super.bindVertexArray(array._)
    } else {
      return
    }

    if (this._activeVertexArrayObject !== array) {
      if (this._activeVertexArrayObject) {
        this._activeVertexArrayObject._refCount -= 1
        this._activeVertexArrayObject._checkDelete()
      }
      if (array) {
        array._refCount += 1
      }
    }

    if (array === null) {
      this._vertexObjectState = this._defaultVertexObjectState
    } else {
      this._vertexObjectState = array._vertexState
    }

    // Update the active vertex array object.
    this._activeVertexArrayObject = array
  }

  blendColor (red, green, blue, alpha) {
    return super.blendColor(+red, +green, +blue, +alpha)
  }

  blendEquation (mode) {
    mode |= 0
    if (this._validBlendMode(mode)) {
      return super.blendEquation(mode)
    }
    this.setError(this.INVALID_ENUM)
  }

  blendEquationSeparate (modeRGB, modeAlpha) {
    modeRGB |= 0
    modeAlpha |= 0
    if (this._validBlendMode(modeRGB) && this._validBlendMode(modeAlpha)) {
      return super.blendEquationSeparate(modeRGB, modeAlpha)
    }
    this.setError(this.INVALID_ENUM)
  }

  createBuffer () {
    const id = super.createBuffer()
    if (id <= 0) return null
    const webGLBuffer = new WebGLBuffer(id, this)
    this._buffers[id] = webGLBuffer
    return webGLBuffer
  }

  createFramebuffer () {
    const id = super.createFramebuffer()
    if (id <= 0) return null
    const webGLFramebuffer = new WebGLFramebuffer(id, this)
    this._framebuffers[id] = webGLFramebuffer
    return webGLFramebuffer
  }

  createProgram () {
    const id = super.createProgram()
    if (id <= 0) return null
    const webGLProgram = new WebGLProgram(id, this)
    this._programs[id] = webGLProgram
    return webGLProgram
  }

  createRenderbuffer () {
    const id = super.createRenderbuffer()
    if (id <= 0) return null
    const webGLRenderbuffer = new WebGLRenderbuffer(id, this)
    this._renderbuffers[id] = webGLRenderbuffer
    return webGLRenderbuffer
  }

  createTexture () {
    const id = super.createTexture()
    if (id <= 0) return null
    const webGlTexture = new WebGLTexture(id, this)
    this._textures[id] = webGlTexture
    return webGlTexture
  }

  createVertexArray () {
    // TODO: do not expose VAO methods in WebGL 1
    const arrayId = super.createVertexArray()
    if (arrayId <= 0) return null
    const array = new WebGLVertexArrayObject(arrayId, this)
    this._vaos[arrayId] = array
    return array
  }

  getContextAttributes () {
    return this._contextAttributes
  }

  getExtension (name) {
    const str = name.toLowerCase()
    if (str in this._extensions) {
      return this._extensions[str]
    }

    if (!(str in availableExtensions)) {
      return null
    }

    super.getExtension(str)
    const ext = availableExtensions[str](this)
    this._extensions[str] = ext
    return ext
  }

  getSupportedExtensions () {
    const ret = super.getSupportedExtensions()
    return ret.split(' ')
  }

  setError (error) {
    NativeWebGL.setError.call(this, error | 0)
  }

  blendFunc (sfactor, dfactor) {
    sfactor |= 0
    dfactor |= 0
    if (!this._validBlendFunc(sfactor) ||
      !this._validBlendFunc(dfactor)) {
      this.setError(this.INVALID_ENUM)
      return
    }
    if ((this._isConstantColorBlendFunc(sfactor) && this._isConstantAlphaBlendFunc(dfactor)) ||
      (this._isConstantColorBlendFunc(dfactor) && this._isConstantAlphaBlendFunc(sfactor))) {
      this.setError(this.INVALID_OPERATION)
      return
    }
    super.blendFunc(sfactor, dfactor)
  }

  blendFuncSeparate (
    srcRGB,
    dstRGB,
    srcAlpha,
    dstAlpha) {
    srcRGB |= 0
    dstRGB |= 0
    srcAlpha |= 0
    dstAlpha |= 0

    if (!(this._validBlendFunc(srcRGB) &&
      this._validBlendFunc(dstRGB) &&
      this._validBlendFunc(srcAlpha) &&
      this._validBlendFunc(dstAlpha))) {
      this.setError(this.INVALID_ENUM)
      return
    }

    if ((this._isConstantColorBlendFunc(srcRGB) && this._isConstantAlphaBlendFunc(dstRGB)) ||
      (this._isConstantColorBlendFunc(dstRGB) && this._isConstantAlphaBlendFunc(srcRGB))) {
      this.setError(this.INVALID_OPERATION)
      return
    }

    super.blendFuncSeparate(
      srcRGB,
      dstRGB,
      srcAlpha,
      dstAlpha)
  }

  bufferData (target, data, usage) {
    target |= 0
    usage |= 0
    if (usage !== this.STREAM_DRAW &&
      usage !== this.STATIC_DRAW &&
      usage !== this.DYNAMIC_DRAW) {
      this.setError(this.INVALID_ENUM)
      return
    }

    if (target !== this.ARRAY_BUFFER &&
      target !== this.ELEMENT_ARRAY_BUFFER) {
      this.setError(this.INVALID_ENUM)
      return
    }

    const active = this._getActiveBuffer(target)
    if (!active) {
      this.setError(this.INVALID_OPERATION)
      return
    }

    if (typeof data === 'object') {
      let u8Data = null
      if (isTypedArray(data) || data instanceof DataView) {
        u8Data = unpackTypedArray(data)
      } else if (data instanceof ArrayBuffer) {
        u8Data = new Uint8Array(data)
      } else {
        this.setError(this.INVALID_VALUE)
        return
      }

      this._saveError()
      super.bufferData(
        target,
        u8Data,
        usage)
      const error = this.getError()
      this._restoreError(error)
      if (error !== this.NO_ERROR) {
        return
      }

      active._size = u8Data.length
      if (target === this.ELEMENT_ARRAY_BUFFER) {
        active._elements = new Uint8Array(u8Data)
      }
    } else if (typeof data === 'number') {
      const size = data | 0
      if (size < 0) {
        this.setError(this.INVALID_VALUE)
        return
      }

      this._saveError()
      super.bufferData(
        target,
        size,
        usage)
      const error = this.getError()
      this._restoreError(error)
      if (error !== this.NO_ERROR) {
        return
      }

      active._size = size
      if (target === this.ELEMENT_ARRAY_BUFFER) {
        active._elements = new Uint8Array(size)
      }
    } else {
      this.setError(this.INVALID_VALUE)
    }
  }

  bufferSubData (target, offset, data) {
    target |= 0
    offset |= 0

    if (target !== this.ARRAY_BUFFER &&
      target !== this.ELEMENT_ARRAY_BUFFER) {
      this.setError(this.INVALID_ENUM)
      return
    }

    if (data === null) {
      return
    }

    if (!data || typeof data !== 'object') {
      this.setError(this.INVALID_VALUE)
      return
    }

    const active = this._getActiveBuffer(target)
    if (!active) {
      this.setError(this.INVALID_OPERATION)
      return
    }

    if (offset < 0 || offset >= active._size) {
      this.setError(this.INVALID_VALUE)
      return
    }

    let u8Data = null
    if (isTypedArray(data) || data instanceof DataView) {
      u8Data = unpackTypedArray(data)
    } else if (data instanceof ArrayBuffer) {
      u8Data = new Uint8Array(data)
    } else {
      this.setError(this.INVALID_VALUE)
      return
    }

    if (offset + u8Data.length > active._size) {
      this.setError(this.INVALID_VALUE)
      return
    }

    if (target === this.ELEMENT_ARRAY_BUFFER) {
      active._elements.set(u8Data, offset)
    }

    super.bufferSubData(
      target,
      offset,
      u8Data)
  }

  checkFramebufferStatus (target) {
    return super.checkFramebufferStatus(target)
  }

  clear (mask) {
    if (!this._framebufferOk()) {
      return
    }
    return super.clear(mask | 0)
  }

  clearColor (red, green, blue, alpha) {
    return super.clearColor(+red, +green, +blue, +alpha)
  }

  clearDepth (depth) {
    return super.clearDepth(+depth)
  }

  clearStencil (s) {
    this._checkStencil = false
    return super.clearStencil(s | 0)
  }

  colorMask (red, green, blue, alpha) {
    return super.colorMask(!!red, !!green, !!blue, !!alpha)
  }

  compileShader (shader) {
    if (!checkObject(shader)) {
      throw new TypeError('compileShader(WebGLShader)')
    }
    if (this._checkWrapper(shader, WebGLShader) &&
      this._checkShaderSource(shader)) {
      const prevError = this.getError()
      super.compileShader(shader._ | 0)
      const error = this.getError()
      shader._compileStatus = !!super.getShaderParameter(
        shader._ | 0,
        this.COMPILE_STATUS)
      shader._compileInfo = super.getShaderInfoLog(shader._ | 0)
      this.getError()
      this.setError(prevError || error)
    }
  }

  copyTexImage2D (
    target,
    level,
    internalFormat,
    x, y, width, height,
    border) {
    target |= 0
    level |= 0
    internalFormat |= 0
    x |= 0
    y |= 0
    width |= 0
    height |= 0
    border |= 0

    this._saveError()
    super.copyTexImage2D(
      target,
      level,
      internalFormat,
      x,
      y,
      width,
      height,
      border)
    const error = this.getError()
    this._restoreError(error)

    if (error === this.NO_ERROR) {
      const texture = this._getTexImage(target)
      texture._format = gl.RGBA
      texture._type = gl.UNSIGNED_BYTE
    }
  }

  copyTexSubImage2D (
    target,
    level,
    xoffset, yoffset,
    x, y, width, height) {
    target |= 0
    level |= 0
    xoffset |= 0
    yoffset |= 0
    x |= 0
    y |= 0
    width |= 0
    height |= 0

    super.copyTexSubImage2D(
      target,
      level,
      xoffset,
      yoffset,
      x,
      y,
      width,
      height)
  }

  cullFace (mode) {
    return super.cullFace(mode | 0)
  }

  createShader (type) {
    type |= 0
    if (type !== this.FRAGMENT_SHADER &&
      type !== this.VERTEX_SHADER) {
      this.setError(this.INVALID_ENUM)
      return null
    }
    const id = super.createShader(type)
    if (id < 0) {
      return null
    }
    const result = new WebGLShader(id, this, type)
    this._shaders[id] = result
    return result
  }

  deleteProgram (object) {
    return this._deleteLinkable('deleteProgram', object, WebGLProgram)
  }

  deleteShader (object) {
    return this._deleteLinkable('deleteShader', object, WebGLShader)
  }

  _deleteLinkable (name, object, Type) {
    if (!checkObject(object)) {
      throw new TypeError(name + '(' + Type.name + ')')
    }
    if (object instanceof Type &&
      this._checkOwns(object)) {
      object._pendingDelete = true
      object._checkDelete()
      return
    }
    if (object !== null) {
      this.setError(this.INVALID_OPERATION)
    }
  }

  deleteBuffer (buffer) {
    if (!checkObject(buffer) ||
      (buffer !== null && !(buffer instanceof WebGLBuffer))) {
      throw new TypeError('deleteBuffer(WebGLBuffer)')
    }

    if (!(buffer instanceof WebGLBuffer &&
      this._checkOwns(buffer))) {
      this.setError(this.INVALID_OPERATION)
      return
    }

    if (this._vertexGlobalState._arrayBufferBinding === buffer) {
      this.bindBuffer(this.ARRAY_BUFFER, null)
    }
    if (this._vertexObjectState._elementArrayBufferBinding === buffer) {
      this.bindBuffer(this.ELEMENT_ARRAY_BUFFER, null)
    }

    if (this._vertexObjectState === this._defaultVertexObjectState) {
      // If no vertex array object is bound, release attrib bindings for the
      // array buffer.
      this._vertexObjectState.releaseArrayBuffer(buffer)
    }

    buffer._pendingDelete = true
    buffer._checkDelete()
  }

  deleteFramebuffer (framebuffer) {
    if (!checkObject(framebuffer)) {
      throw new TypeError('deleteFramebuffer(WebGLFramebuffer)')
    }

    if (!(framebuffer instanceof WebGLFramebuffer &&
      this._checkOwns(framebuffer))) {
      this.setError(this.INVALID_OPERATION)
      return
    }

    if (this._activeFramebuffers.draw === framebuffer && this._activeFramebuffers.read === framebuffer) {
      this.bindFramebuffer(this.FRAMEBUFFER, null)
    } else if (this._isWebGL2()) {
      if (this._activeFramebuffers.read === framebuffer) {
        this.bindFramebuffer(this.READ_FRAMEBUFFER, null)
      } else if (this._activeFramebuffers.draw === framebuffer) {
        this.bindFramebuffer(this.DRAW_FRAMEBUFFER, null)
      }
    }

    framebuffer._pendingDelete = true
    framebuffer._checkDelete()
  }

  // Need to handle textures and render buffers as a special case:
  // When a texture gets deleted, we need to do the following extra steps:
  //  1. Is it bound to the current texture unit?
  //     If so, then unbind it
  //  2. Is it attached to the active fbo?
  //     If so, then detach it
  //
  // For renderbuffers only need to do second step
  //
  // After this, proceed with the usual deletion algorithm
  //
  deleteRenderbuffer (renderbuffer) {
    if (!checkObject(renderbuffer)) {
      throw new TypeError('deleteRenderbuffer(WebGLRenderbuffer)')
    }

    if (!(renderbuffer instanceof WebGLRenderbuffer &&
      this._checkOwns(renderbuffer))) {
      this.setError(this.INVALID_OPERATION)
      return
    }

    if (this._activeRenderbuffer === renderbuffer) {
      this.bindRenderbuffer(this.RENDERBUFFER, null)
    }

    renderbuffer._pendingDelete = true
    renderbuffer._checkDelete()
  }

  deleteTexture (texture) {
    if (!checkObject(texture)) {
      throw new TypeError('deleteTexture(WebGLTexture)')
    }

    if (texture instanceof WebGLTexture) {
      if (!this._checkOwns(texture)) {
        this.setError(this.INVALID_OPERATION)
        return
      }
    } else {
      return
    }

    // Unbind from all texture units
    const curActive = this._activeTextureUnit

    for (let i = 0; i < this._textureUnits.length; ++i) {
      const unit = this._textureUnits[i]
      if (unit._bind2D === texture) {
        this.activeTexture(this.TEXTURE0 + i)
        this.bindTexture(this.TEXTURE_2D, null)
      } else if (unit._bindCube === texture) {
        this.activeTexture(this.TEXTURE0 + i)
        this.bindTexture(this.TEXTURE_CUBE_MAP, null)
      } else if (this._isWebGL2() && unit._bind2DArray === texture) {
        this.activeTexture(this.TEXTURE_2D_ARRAY)
        this.bindTexture(this.TEXTURE_2D_ARRAY, null)
      } else if (this._isWebGL2() && unit._bind3D === texture) {
        this.activeTexture(this.TEXTURE_3D)
        this.bindTexture(this.TEXTURE_3D, null)
      }
    }
    this.activeTexture(this.TEXTURE0 + curActive)

    // Mark texture for deletion
    texture._pendingDelete = true
    texture._checkDelete()
  }

  deleteVertexArray (array) {
    if (!checkObject(array)) {
      throw new TypeError('deleteVertexArray(WebGLVertexArrayObject)')
    }

    if (!(array instanceof WebGLVertexArrayObject &&
      this._checkOwns(array))) {
      this.setError(gl.INVALID_OPERATION)
      return
    }

    if (array._pendingDelete) {
      return
    }

    if (this._activeVertexArrayObject === array) {
      this.bindVertexArray(null)
    }

    array._pendingDelete = true
    array._checkDelete()
  }

  depthFunc (func) {
    func |= 0
    switch (func) {
      case this.NEVER:
      case this.LESS:
      case this.EQUAL:
      case this.LEQUAL:
      case this.GREATER:
      case this.NOTEQUAL:
      case this.GEQUAL:
      case this.ALWAYS:
        return super.depthFunc(func)
      default:
        this.setError(this.INVALID_ENUM)
    }
  }

  depthMask (flag) {
    return super.depthMask(!!flag)
  }

  depthRange (zNear, zFar) {
    zNear = +zNear
    zFar = +zFar
    if (zNear <= zFar) {
      return super.depthRange(zNear, zFar)
    }
    this.setError(this.INVALID_OPERATION)
  }

  destroy () {
    super.destroy()
  }

  detachShader (program, shader) {
    if (!checkObject(program) ||
      !checkObject(shader)) {
      throw new TypeError('detachShader(WebGLProgram, WebGLShader)')
    }
    if (this._checkWrapper(program, WebGLProgram) &&
      this._checkWrapper(shader, WebGLShader)) {
      if (program._linked(shader)) {
        super.detachShader(program._, shader._)
        program._unlink(shader)
      } else {
        this.setError(this.INVALID_OPERATION)
      }
    }
  }

  disable (cap) {
    cap |= 0
    super.disable(cap)
    if (cap === this.TEXTURE_2D ||
      cap === this.TEXTURE_CUBE_MAP) {
      const active = this._getActiveTextureUnit()
      if (active._mode === cap) {
        active._mode = 0
      }
    }
  }

  disableVertexAttribArray (index) {
    index |= 0
    if (index < 0 || index >= this._vertexObjectState._attribs.length) {
      this.setError(this.INVALID_VALUE)
      return
    }
    super.disableVertexAttribArray(index)
    this._vertexObjectState._attribs[index]._isPointer = false
  }

  drawArrays (mode, first, count) {
    mode |= 0
    first |= 0
    count |= 0

    return super.drawArrays(mode, first, count)
  }

  drawElements (mode, count, type, ioffset) {
    mode |= 0
    count |= 0
    type |= 0
    ioffset |= 0

    return super.drawElements(mode, count, type, ioffset)
  }

  enable (cap) {
    cap |= 0
    super.enable(cap)
  }

  enableVertexAttribArray (index) {
    index |= 0
    if (index < 0 || index >= this._vertexObjectState._attribs.length) {
      this.setError(this.INVALID_VALUE)
      return
    }

    super.enableVertexAttribArray(index)

    this._vertexObjectState._attribs[index]._isPointer = true
  }

  finish () {
    return super.finish()
  }

  flush () {
    return super.flush()
  }

  framebufferRenderbuffer (
    target,
    attachment,
    renderbufferTarget,
    renderbuffer) {
    target = target | 0
    attachment = attachment | 0
    renderbufferTarget = renderbufferTarget | 0

    if (!checkObject(renderbuffer)) {
      throw new TypeError('framebufferRenderbuffer(GLenum, GLenum, GLenum, WebGLRenderbuffer)')
    }

    // Since we emulate the default framebuffer, we can't rely on ANGLE's validation.
    if (!this._getActiveFramebuffer(target)) {
      this.setError(this.INVALID_OPERATION)
      return
    }

    if (renderbuffer && !this._checkWrapper(renderbuffer, WebGLRenderbuffer)) {
      return
    }

    super.framebufferRenderbuffer(target, attachment, renderbufferTarget, renderbuffer?._ ?? null)
  }

  framebufferTexture2D (
    target,
    attachment,
    textarget,
    texture,
    level) {
    target |= 0
    attachment |= 0
    textarget |= 0
    level |= 0
    if (!checkObject(texture)) {
      throw new TypeError('framebufferTexture2D(GLenum, GLenum, GLenum, WebGLTexture, GLint)')
    }

    // Check object ownership
    if (texture && !this._checkWrapper(texture, WebGLTexture)) {
      return
    }

    // Since we emulate the default framebuffer, we can't rely on ANGLE's validation.
    if (!this._getActiveFramebuffer(target)) {
      this.setError(this.INVALID_OPERATION)
      return
    }

    super.framebufferTexture2D(target, attachment, textarget, texture?._ ?? null, level)
  }

  framebufferTextureLayer (target, attachment, texture, level, layer) {
    target |= 0
    attachment |= 0
    level |= 0
    layer |= 0
    if (!checkObject(texture)) {
      throw new TypeError('framebufferTextureLayer(GLenum, GLenum, WebGLTexture, GLint, GLint)')
    }

    // Check object ownership
    if (texture && !this._checkWrapper(texture, WebGLTexture)) {
      return
    }

    // Since we emulate the default framebuffer, we can't rely on ANGLE's validation.
    if (!this._getActiveFramebuffer(target)) {
      this.setError(this.INVALID_OPERATION)
      return
    }

    super.framebufferTextureLayer(target, attachment, texture?._ ?? null, level, layer)
  }

  frontFace (mode) {
    return super.frontFace(mode | 0)
  }

  generateMipmap (target) {
    return super.generateMipmap(target | 0) | 0
  }

  getActiveAttrib (program, index) {
    if (!checkObject(program)) {
      throw new TypeError('getActiveAttrib(WebGLProgram)')
    } else if (!program) {
      this.setError(this.INVALID_VALUE)
    } else if (this._checkWrapper(program, WebGLProgram)) {
      const info = super.getActiveAttrib(program._ | 0, index | 0)
      if (info) {
        return new WebGLActiveInfo(info)
      }
    }
    return null
  }

  getActiveUniform (program, index) {
    if (!checkObject(program)) {
      throw new TypeError('getActiveUniform(WebGLProgram, GLint)')
    } else if (!program) {
      this.setError(this.INVALID_VALUE)
    } else if (this._checkWrapper(program, WebGLProgram)) {
      const info = super.getActiveUniform(program._ | 0, index | 0)
      if (info) {
        return new WebGLActiveInfo(info)
      }
    }
    return null
  }

  getAttachedShaders (program) {
    if (!checkObject(program) ||
      (typeof program === 'object' &&
        program !== null &&
        !(program instanceof WebGLProgram))) {
      throw new TypeError('getAttachedShaders(WebGLProgram)')
    }
    if (!program) {
      this.setError(this.INVALID_VALUE)
    } else if (this._checkWrapper(program, WebGLProgram)) {
      const shaderArray = super.getAttachedShaders(program._ | 0)
      if (!shaderArray) {
        return null
      }
      const unboxedShaders = new Array(shaderArray.length)
      for (let i = 0; i < shaderArray.length; ++i) {
        unboxedShaders[i] = this._shaders[shaderArray[i]]
      }
      return unboxedShaders
    }
    return null
  }

  getAttribLocation (program, name) {
    if (!checkObject(program)) {
      throw new TypeError('getAttribLocation(WebGLProgram, String)')
    }
    name += ''
    if (!isValidString(name) || name.length > MAX_ATTRIBUTE_LENGTH) {
      this.setError(this.INVALID_VALUE)
    } else if (this._checkWrapper(program, WebGLProgram)) {
      return super.getAttribLocation(program._ | 0, name + '')
    }
    return -1
  }

  getParameter (pname) {
    switch (pname) {
      case this.COMPRESSED_TEXTURE_FORMATS:
        return new Uint32Array(0)
      case this.ARRAY_BUFFER_BINDING:
        return this._vertexGlobalState._arrayBufferBinding
      case this.ELEMENT_ARRAY_BUFFER_BINDING:
        return this._vertexObjectState._elementArrayBufferBinding
      case this.CURRENT_PROGRAM:
        return this._activeProgram
      case this.FRAMEBUFFER_BINDING:
        return this._activeFramebuffers.draw
      case this.READ_FRAMEBUFFER_BINDING:
        return this._activeFramebuffers.read
      case this.RENDERBUFFER_BINDING:
        return this._activeRenderbuffer
      case this.TEXTURE_BINDING_2D:
        return this._getActiveTextureUnit()._bind2D
      case this.TEXTURE_BINDING_CUBE_MAP:
        return this._getActiveTextureUnit()._bindCube
      case this.VERSION:
        return 'WebGL 1.0 stack-gl ' + HEADLESS_VERSION
      case this.VENDOR:
        return 'stack-gl'
      case this.RENDERER:
        return 'ANGLE'
      case this.SHADING_LANGUAGE_VERSION:
        return 'WebGL GLSL ES 1.0 stack-gl'

      default:
        if (this._extensions) {
          if (this._extensions.oes_vertex_array_object && pname === this._extensions.oes_vertex_array_object.VERTEX_ARRAY_BINDING_OES) {
            return this._extensions.oes_vertex_array_object._activeVertexArrayObject
          }
        }
        return super.getParameter(pname)
    }
  }

  getShaderPrecisionFormat (
    shaderType,
    precisionType) {
    shaderType |= 0
    precisionType |= 0

    if (!(shaderType === this.FRAGMENT_SHADER ||
      shaderType === this.VERTEX_SHADER) ||
      !(precisionType === this.LOW_FLOAT ||
        precisionType === this.MEDIUM_FLOAT ||
        precisionType === this.HIGH_FLOAT ||
        precisionType === this.LOW_INT ||
        precisionType === this.MEDIUM_INT ||
        precisionType === this.HIGH_INT)) {
      this.setError(this.INVALID_ENUM)
      return
    }

    const format = super.getShaderPrecisionFormat(shaderType, precisionType)
    if (!format) {
      return null
    }

    return new WebGLShaderPrecisionFormat(format)
  }

  getBufferParameter (target, pname) {
    target |= 0
    pname |= 0
    if (target !== this.ARRAY_BUFFER &&
      target !== this.ELEMENT_ARRAY_BUFFER) {
      this.setError(this.INVALID_ENUM)
      return null
    }

    switch (pname) {
      case this.BUFFER_SIZE:
      case this.BUFFER_USAGE:
        return super.getBufferParameter(target | 0, pname | 0)
      default:
        this.setError(this.INVALID_ENUM)
        return null
    }
  }

  getError () {
    return super.getError()
  }

  getFramebufferAttachmentParameter (target, attachment, pname) {
    target |= 0
    attachment |= 0
    pname |= 0

    // Since we emulate the default framebuffer, we can't rely on ANGLE's validation.
    if (!this._getActiveFramebuffer(target)) {
      this.setError(this.INVALID_OPERATION)
      return null
    }

    this._saveError()
    const result = super.getFramebufferAttachmentParameter(target, attachment, pname)
    const error = super.getError()
    this._restoreError(error)

    if (error) {
      return null
    }

    if (error === this.NO_ERROR && pname === this.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME) {
      const type = super.getFramebufferAttachmentParameter(target, attachment, this.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE)
      if (type === this.RENDERBUFFER) {
        return this._renderbuffers[result]
      } else {
        return this._textures[result]
      }
    }

    return result
  }

  getProgramParameter (program, pname) {
    pname |= 0
    if (!checkObject(program)) {
      throw new TypeError('getProgramParameter(WebGLProgram, GLenum)')
    } else if (this._checkWrapper(program, WebGLProgram)) {
      switch (pname) {
        case this.DELETE_STATUS:
          return program._pendingDelete

        case this.LINK_STATUS:
          return program._linkStatus

        case this.VALIDATE_STATUS:
          return !!super.getProgramParameter(program._, pname)

        case this.ATTACHED_SHADERS:
        case this.ACTIVE_ATTRIBUTES:
        case this.ACTIVE_UNIFORMS:
          return super.getProgramParameter(program._, pname)
      }
      this.setError(this.INVALID_ENUM)
    }
    return null
  }

  getProgramInfoLog (program) {
    if (!checkObject(program)) {
      throw new TypeError('getProgramInfoLog(WebGLProgram)')
    } else if (this._checkWrapper(program, WebGLProgram)) {
      return program._linkInfoLog
    }
    return null
  }

  getRenderbufferParameter (target, pname) {
    target |= 0
    pname |= 0
    if (target !== this.RENDERBUFFER) {
      this.setError(this.INVALID_ENUM)
      return null
    }
    const renderbuffer = this._activeRenderbuffer
    if (!renderbuffer) {
      this.setError(this.INVALID_OPERATION)
      return null
    }
    switch (pname) {
      case this.RENDERBUFFER_INTERNAL_FORMAT:
        return renderbuffer._format
      case this.RENDERBUFFER_WIDTH:
        return renderbuffer._width
      case this.RENDERBUFFER_HEIGHT:
        return renderbuffer._height
      case this.RENDERBUFFER_SIZE:
      case this.RENDERBUFFER_RED_SIZE:
      case this.RENDERBUFFER_GREEN_SIZE:
      case this.RENDERBUFFER_BLUE_SIZE:
      case this.RENDERBUFFER_ALPHA_SIZE:
      case this.RENDERBUFFER_DEPTH_SIZE:
      case this.RENDERBUFFER_STENCIL_SIZE:
        return super.getRenderbufferParameter(target, pname)
    }
    this.setError(this.INVALID_ENUM)
    return null
  }

  getShaderParameter (shader, pname) {
    pname |= 0
    if (!checkObject(shader)) {
      throw new TypeError('getShaderParameter(WebGLShader, GLenum)')
    } else if (this._checkWrapper(shader, WebGLShader)) {
      switch (pname) {
        case this.DELETE_STATUS:
          return shader._pendingDelete
        case this.COMPILE_STATUS:
          return shader._compileStatus
        case this.SHADER_TYPE:
          return shader._type
      }
      this.setError(this.INVALID_ENUM)
    }
    return null
  }

  getShaderInfoLog (shader) {
    if (!checkObject(shader)) {
      throw new TypeError('getShaderInfoLog(WebGLShader)')
    } else if (this._checkWrapper(shader, WebGLShader)) {
      return shader._compileInfo
    }
    return null
  }

  getShaderSource (shader) {
    if (!checkObject(shader)) {
      throw new TypeError('Input to getShaderSource must be an object')
    } else if (this._checkWrapper(shader, WebGLShader)) {
      return shader._source
    }
    return null
  }

  getTexParameter (target, pname) {
    target |= 0
    pname |= 0

    if (!this._checkTextureTarget(target)) {
      return null
    }

    const unit = this._getActiveTextureUnit()
    if ((target === this.TEXTURE_2D && !unit._bind2D) ||
      (target === this.TEXTURE_CUBE_MAP && !unit._bindCube)) {
      this.setError(this.INVALID_OPERATION)
      return null
    }

    switch (pname) {
      case this.TEXTURE_MAG_FILTER:
      case this.TEXTURE_MIN_FILTER:
      case this.TEXTURE_WRAP_S:
      case this.TEXTURE_WRAP_T:
        return super.getTexParameter(target, pname)
    }

    if (this._extensions.ext_texture_filter_anisotropic && pname === this._extensions.ext_texture_filter_anisotropic.TEXTURE_MAX_ANISOTROPY_EXT) {
      return super.getTexParameter(target, pname)
    }

    this.setError(this.INVALID_ENUM)
    return null
  }

  getUniform (program, location) {
    if (!checkObject(program) ||
      !checkObject(location)) {
      throw new TypeError('getUniform(WebGLProgram, WebGLUniformLocation)')
    } else if (!program) {
      this.setError(this.INVALID_VALUE)
      return null
    } else if (!location) {
      return null
    } else if (this._checkWrapper(program, WebGLProgram)) {
      if (!checkUniform(program, location)) {
        this.setError(this.INVALID_OPERATION)
        return null
      }
      const data = super.getUniform(program._ | 0, location._ | 0)
      if (!data) {
        return null
      }
      switch (location._activeInfo.type) {
        case this.FLOAT:
          return data[0]
        case this.FLOAT_VEC2:
          return new Float32Array(data.slice(0, 2))
        case this.FLOAT_VEC3:
          return new Float32Array(data.slice(0, 3))
        case this.FLOAT_VEC4:
          return new Float32Array(data.slice(0, 4))
        case this.INT:
          return data[0] | 0
        case this.INT_VEC2:
          return new Int32Array(data.slice(0, 2))
        case this.INT_VEC3:
          return new Int32Array(data.slice(0, 3))
        case this.INT_VEC4:
          return new Int32Array(data.slice(0, 4))
        case this.BOOL:
          return !!data[0]
        case this.BOOL_VEC2:
          return [!!data[0], !!data[1]]
        case this.BOOL_VEC3:
          return [!!data[0], !!data[1], !!data[2]]
        case this.BOOL_VEC4:
          return [!!data[0], !!data[1], !!data[2], !!data[3]]
        case this.FLOAT_MAT2:
          return new Float32Array(data.slice(0, 4))
        case this.FLOAT_MAT3:
          return new Float32Array(data.slice(0, 9))
        case this.FLOAT_MAT4:
          return new Float32Array(data.slice(0, 16))
        case this.SAMPLER_2D:
        case this.SAMPLER_CUBE:
          return data[0] | 0
        default:
          return null
      }
    }
    return null
  }

  getUniformLocation (program, name) {
    if (!checkObject(program)) {
      throw new TypeError('getUniformLocation(WebGLProgram, String)')
    }

    name += ''
    if (!isValidString(name)) {
      this.setError(this.INVALID_VALUE)
      return
    }

    if (this._checkWrapper(program, WebGLProgram)) {
      const loc = super.getUniformLocation(program._ | 0, name)
      if (loc >= 0) {
        let searchName = name
        if (/\[\d+\]$/.test(name)) {
          searchName = name.replace(/\[\d+\]$/, '[0]')
        }

        let info = null
        for (let i = 0; i < program._uniforms.length; ++i) {
          const infoItem = program._uniforms[i]
          if (infoItem.name === searchName) {
            info = {
              size: infoItem.size,
              type: infoItem.type,
              name: infoItem.name
            }
          }
        }
        if (!info) {
          return null
        }

        const result = new WebGLUniformLocation(
          loc,
          program,
          info)

        // handle array case
        if (/\[0\]$/.test(name)) {
          const baseName = name.replace(/\[0\]$/, '')
          const arrayLocs = []

          // if (offset < 0 || offset >= info.size) {
          //   return null
          // }

          this._saveError()
          for (let i = 0; this.getError() === this.NO_ERROR; ++i) {
            const xloc = super.getUniformLocation(
              program._ | 0,
              baseName + '[' + i + ']')
            if (this.getError() !== this.NO_ERROR || xloc < 0) {
              break
            }
            arrayLocs.push(xloc)
          }
          this._restoreError(this.NO_ERROR)

          result._array = arrayLocs
        } else if (/\[(\d+)\]$/.test(name)) {
          const offset = +(/\[(\d+)\]$/.exec(name))[1]
          if (offset < 0 || offset >= info.size) {
            return null
          }
        }
        return result
      }
    }
    return null
  }

  getVertexAttrib (index, pname) {
    index |= 0
    pname |= 0
    if (index < 0 || index >= this._vertexObjectState._attribs.length) {
      this.setError(this.INVALID_VALUE)
      return null
    }
    const attrib = this._vertexObjectState._attribs[index]
    const vertexAttribValue = this._vertexGlobalState._attribs[index]._data

    switch (pname) {
      case this.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING:
        return attrib._pointerBuffer
      case this.VERTEX_ATTRIB_ARRAY_ENABLED:
        return attrib._isPointer
      case this.VERTEX_ATTRIB_ARRAY_SIZE:
        return attrib._inputSize
      case this.VERTEX_ATTRIB_ARRAY_STRIDE:
        return attrib._inputStride
      case this.VERTEX_ATTRIB_ARRAY_TYPE:
        return attrib._pointerType
      case this.VERTEX_ATTRIB_ARRAY_NORMALIZED:
        return attrib._pointerNormal
      case this.CURRENT_VERTEX_ATTRIB:
        return new Float32Array(vertexAttribValue)
      default:
        return super.getVertexAttrib(index, pname)
    }
  }

  getVertexAttribOffset (index, pname) {
    index |= 0
    pname |= 0
    if (index < 0 || index >= this._vertexObjectState._attribs.length) {
      this.setError(this.INVALID_VALUE)
      return null
    }
    if (pname === this.VERTEX_ATTRIB_ARRAY_POINTER) {
      return this._vertexObjectState._attribs[index]._pointerOffset
    } else {
      this.setError(this.INVALID_ENUM)
      return null
    }
  }

  hint (target, mode) {
    target |= 0
    mode |= 0

    if (!(
      target === this.GENERATE_MIPMAP_HINT ||
      (
        this._extensions.oes_standard_derivatives && target === this._extensions.oes_standard_derivatives.FRAGMENT_SHADER_DERIVATIVE_HINT_OES
      )
    )) {
      this.setError(this.INVALID_ENUM)
      return
    }

    if (mode !== this.FASTEST &&
      mode !== this.NICEST &&
      mode !== this.DONT_CARE) {
      this.setError(this.INVALID_ENUM)
      return
    }

    return super.hint(target, mode)
  }

  isBuffer (object) {
    if (!this._isObject(object, 'isBuffer', WebGLBuffer)) return false
    return super.isBuffer(object._ | 0)
  }

  isFramebuffer (object) {
    if (!this._isObject(object, 'isFramebuffer', WebGLFramebuffer)) return false
    return super.isFramebuffer(object._ | 0)
  }

  isProgram (object) {
    if (!this._isObject(object, 'isProgram', WebGLProgram)) return false
    return super.isProgram(object._ | 0)
  }

  isRenderbuffer (object) {
    if (!this._isObject(object, 'isRenderbuffer', WebGLRenderbuffer)) return false
    return super.isRenderbuffer(object._ | 0)
  }

  isShader (object) {
    if (!this._isObject(object, 'isShader', WebGLShader)) return false
    return super.isShader(object._ | 0)
  }

  isTexture (object) {
    if (!this._isObject(object, 'isTexture', WebGLTexture)) return false
    return super.isTexture(object._ | 0)
  }

  isVertexArray (object) {
    if (!this._isObject(object, 'isVertexArray', WebGLVertexArrayObject)) return false
    return super.isVertexArray(object._ | 0)
  }

  isEnabled (cap) {
    return super.isEnabled(cap | 0)
  }

  lineWidth (width) {
    if (isNaN(width)) {
      this.setError(this.INVALID_VALUE)
      return
    }
    return super.lineWidth(+width)
  }

  linkProgram (program) {
    if (!checkObject(program)) {
      throw new TypeError('linkProgram(WebGLProgram)')
    }
    if (this._checkWrapper(program, WebGLProgram)) {
      program._linkCount += 1
      program._attributes = []
      const prevError = this.getError()
      super.linkProgram(program._ | 0)
      const error = this.getError()
      if (error === this.NO_ERROR) {
        program._linkStatus = this._fixupLink(program)
      }
      this.getError()
      this.setError(prevError || error)
    }
  }

  pixelStorei (pname, param) {
    pname |= 0
    param |= 0
    if (pname === this.UNPACK_ALIGNMENT) {
      if (param === 1 ||
        param === 2 ||
        param === 4 ||
        param === 8) {
        this._unpackAlignment = param
      } else {
        this.setError(this.INVALID_VALUE)
        return
      }
    } else if (pname === this.PACK_ALIGNMENT) {
      if (param === 1 ||
        param === 2 ||
        param === 4 ||
        param === 8) {
        this._packAlignment = param
      } else {
        this.setError(this.INVALID_VALUE)
        return
      }
    } else if (pname === this.UNPACK_COLORSPACE_CONVERSION_WEBGL) {
      if (!(param === this.NONE || param === this.BROWSER_DEFAULT_WEBGL)) {
        this.setError(this.INVALID_VALUE)
        return
      }
    }
    return super.pixelStorei(pname, param)
  }

  polygonOffset (factor, units) {
    return super.polygonOffset(+factor, +units)
  }

  readPixels (x, y, width, height, format, type, pixels) {
    x |= 0
    y |= 0
    width |= 0
    height |= 0

    super.readPixels(
      x,
      y,
      width,
      height,
      format,
      type,
      pixels)
  }

  renderbufferStorage (
    target,
    internalFormat,
    width,
    height) {
    target |= 0
    internalFormat |= 0
    width |= 0
    height |= 0

    if (target !== this.RENDERBUFFER) {
      this.setError(this.INVALID_ENUM)
      return
    }

    const renderbuffer = this._activeRenderbuffer
    if (!renderbuffer) {
      this.setError(this.INVALID_OPERATION)
      return
    }

    this._saveError()
    super.renderbufferStorage(
      target,
      internalFormat,
      width,
      height)
    const error = this.getError()
    this._restoreError(error)
    if (error !== this.NO_ERROR) {
      return
    }

    renderbuffer._width = width
    renderbuffer._height = height
    renderbuffer._format = internalFormat
  }

  resize (width, height) {
    width = width | 0
    height = height | 0
    if (!(width > 0 && height > 0)) {
      throw new Error('Invalid surface dimensions')
    } else if (width !== this.drawingBufferWidth ||
      height !== this.drawingBufferHeight) {
      this._resizeDrawingBuffer(width, height)
      this.drawingBufferWidth = width
      this.drawingBufferHeight = height
    }
  }

  sampleCoverage (value, invert) {
    return super.sampleCoverage(+value, !!invert)
  }

  scissor (x, y, width, height) {
    return super.scissor(x | 0, y | 0, width | 0, height | 0)
  }

  shaderSource (shader, source) {
    if (!checkObject(shader)) {
      throw new TypeError('shaderSource(WebGLShader, String)')
    }
    if (!shader || (!source && typeof source !== 'string')) {
      this.setError(this.INVALID_VALUE)
      return
    }
    source += ''
    if (!isValidString(source)) {
      this.setError(this.INVALID_VALUE)
    } else if (this._checkWrapper(shader, WebGLShader)) {
      super.shaderSource(shader._ | 0, this._wrapShader(shader._type, source)) // eslint-disable-line
      shader._source = source
    }
  }

  stencilFunc (func, ref, mask) {
    this._checkStencil = true
    return super.stencilFunc(func | 0, ref | 0, mask | 0)
  }

  stencilFuncSeparate (face, func, ref, mask) {
    this._checkStencil = true
    return super.stencilFuncSeparate(face | 0, func | 0, ref | 0, mask | 0)
  }

  stencilMask (mask) {
    this._checkStencil = true
    return super.stencilMask(mask | 0)
  }

  stencilMaskSeparate (face, mask) {
    this._checkStencil = true
    return super.stencilMaskSeparate(face | 0, mask | 0)
  }

  stencilOp (fail, zfail, zpass) {
    this._checkStencil = true
    return super.stencilOp(fail | 0, zfail | 0, zpass | 0)
  }

  stencilOpSeparate (face, fail, zfail, zpass) {
    this._checkStencil = true
    return super.stencilOpSeparate(face | 0, fail | 0, zfail | 0, zpass | 0)
  }

  texImage2D (
    target,
    level,
    internalFormat,
    width,
    height,
    border,
    format,
    type,
    pixels) {
    if (arguments.length === 6) {
      pixels = border
      type = height
      format = width

      pixels = extractImageData(pixels)

      if (pixels == null) {
        throw new TypeError('texImage2D(GLenum, GLint, GLenum, GLint, GLenum, GLenum, ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement)')
      }

      width = pixels.width
      height = pixels.height
      pixels = pixels.data
    }

    target |= 0
    level |= 0
    internalFormat |= 0
    width |= 0
    height |= 0
    border |= 0
    format |= 0
    type |= 0

    if (typeof pixels !== 'object' && pixels !== undefined) {
      throw new TypeError('texImage2D(GLenum, GLint, GLenum, GLint, GLint, GLint, GLenum, GLenum, Uint8Array)')
    }

    // Note: there's an ANGLE bug where it doesn't check for setting texImage2D on texture zero in WebGL compat.
    if (this._getActiveTexture(target) === null) {
      if (target === this.TEXTURE_2D || target === this.TEXTURE_CUBE_MAP) {
        this.setError(this.INVALID_OPERATION)
        return
      }
    }

    const data = convertPixels(pixels)

    // Need to check for out of memory error
    this._saveError()
    super.texImage2D(
      target,
      level,
      internalFormat,
      width,
      height,
      border,
      format,
      type,
      data)
    const error = this.getError()
    this._restoreError(error)
    if (error === this.NO_ERROR) {
      const texture = this._getTexImage(target)
      texture._format = format
      texture._type = type
    }
  }

  texSubImage2D (
    target,
    level,
    xoffset,
    yoffset,
    width,
    height,
    format,
    type,
    pixels) {
    if (arguments.length === 7) {
      pixels = format
      type = height
      format = width

      pixels = extractImageData(pixels)

      if (pixels == null) {
        throw new TypeError('texSubImage2D(GLenum, GLint, GLint, GLint, GLenum, GLenum, ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement)')
      }

      width = pixels.width
      height = pixels.height
      pixels = pixels.data
    }

    if (typeof pixels !== 'object') {
      throw new TypeError('texSubImage2D(GLenum, GLint, GLint, GLint, GLint, GLint, GLenum, GLenum, Uint8Array)')
    }

    const data = convertPixels(pixels)

    super.texSubImage2D(
      target,
      level,
      xoffset,
      yoffset,
      width,
      height,
      format,
      type,
      data)
  }

  texParameterf (target, pname, param) {
    target |= 0
    pname |= 0
    param = +param

    if (this._checkTextureTarget(target)) {
      this._verifyTextureCompleteness(target, pname, param)
      switch (pname) {
        case this.TEXTURE_MIN_FILTER:
        case this.TEXTURE_MAG_FILTER:
        case this.TEXTURE_WRAP_S:
        case this.TEXTURE_WRAP_T:
          return super.texParameterf(target, pname, param)
      }

      if (this._extensions.ext_texture_filter_anisotropic && pname === this._extensions.ext_texture_filter_anisotropic.TEXTURE_MAX_ANISOTROPY_EXT) {
        return super.texParameterf(target, pname, param)
      }

      this.setError(this.INVALID_ENUM)
    }
  }

  texParameteri (target, pname, param) {
    target |= 0
    pname |= 0
    param |= 0

    // Note: there's an ANGLE bug where it doesn't check for setting texParameter on texture zero in WebGL compat.
    if (!this._checkTextureTarget(target)) {
      return
    }
    return super.texParameteri(target, pname, param)
  }

  useProgram (program) {
    if (!checkObject(program)) {
      throw new TypeError('useProgram(WebGLProgram)')
    } else if (!program) {
      this._switchActiveProgram(this._activeProgram)
      this._activeProgram = null
      return super.useProgram(0)
    } else if (this._checkWrapper(program, WebGLProgram)) {
      if (this._activeProgram !== program) {
        this._switchActiveProgram(this._activeProgram)
        this._activeProgram = program
        program._refCount += 1
      }
      return super.useProgram(program._ | 0)
    }
  }

  validateProgram (program) {
    if (this._checkWrapper(program, WebGLProgram)) {
      super.validateProgram(program._ | 0)
      const error = this.getError()
      if (error === this.NO_ERROR) {
        program._linkInfoLog = super.getProgramInfoLog(program._ | 0)
      }
      this.getError()
      this.setError(error)
    }
  }

  vertexAttribPointer (
    index,
    size,
    type,
    normalized,
    stride,
    offset) {
    if (stride < 0 || offset < 0) {
      this.setError(this.INVALID_VALUE)
      return
    }

    index |= 0
    size |= 0
    type |= 0
    normalized = !!normalized
    stride |= 0
    offset |= 0

    if (stride < 0 ||
      offset < 0 ||
      index < 0 || index >= this._vertexObjectState._attribs.length ||
      !(size === 1 || size === 2 || size === 3 || size === 4)) {
      this.setError(this.INVALID_VALUE)
      return
    }

    if (this._vertexGlobalState._arrayBufferBinding === null) {
      this.setError(this.INVALID_OPERATION)
      return
    }

    // fixed, int and unsigned int aren't allowed in WebGL
    const byteSize = typeSize(type)
    if (byteSize === 0 ||
      type === this.INT ||
      type === this.UNSIGNED_INT) {
      this.setError(this.INVALID_ENUM)
      return
    }

    if (stride > 255 || stride < 0) {
      this.setError(this.INVALID_VALUE)
      return
    }

    // stride and offset must be multiples of size
    if ((stride % byteSize) !== 0 ||
      (offset % byteSize) !== 0) {
      this.setError(this.INVALID_OPERATION)
      return
    }

    // Call vertex attrib pointer
    super.vertexAttribPointer(index, size, type, normalized, stride, offset)

    // Update the vertex state object and references.
    this._vertexObjectState.setVertexAttribPointer(
      /* buffer */ this._vertexGlobalState._arrayBufferBinding,
      /* index */ index,
      /* pointerSize */ size * byteSize,
      /* pointerOffset */ offset,
      /* pointerStride */ stride || (size * byteSize),
      /* pointerType */ type,
      /* pointerNormal */ normalized,
      /* inputStride */ stride,
      /* inputSize */ size
    )
  }

  viewport (x, y, width, height) {
    return super.viewport(x | 0, y | 0, width | 0, height | 0)
  }

  _allocateDrawingBuffer (width, height) {
    this._drawingBuffer = new WebGLDrawingBufferWrapper(
      super.createFramebuffer(),
      super.createTexture(),
      super.createRenderbuffer())

    this._resizeDrawingBuffer(width, height)
  }

  isContextLost () {
    return false
  }

  compressedTexImage2D () {
    // TODO not yet implemented
  }

  compressedTexSubImage2D () {
    // TODO not yet implemented
  }

  _checkUniformValid (location, v0, name, count, type) {
    if (!checkObject(location)) {
      throw new TypeError(`${name}(WebGLUniformLocation, ...)`)
    } else if (!location) {
      return false
    } else if (this._checkLocationActive(location)) {
      const utype = location._activeInfo.type
      if (utype === this.SAMPLER_2D || utype === this.SAMPLER_CUBE) {
        if (count !== 1) {
          this.setError(this.INVALID_VALUE)
          return
        }
        if (type !== 'i') {
          this.setError(this.INVALID_OPERATION)
          return
        }
        if (v0 < 0 || v0 >= this._textureUnits.length) {
          this.setError(this.INVALID_VALUE)
          return false
        }
      }
      if (uniformTypeSize(utype) > count) {
        this.setError(this.INVALID_OPERATION)
        return false
      }
      return true
    }
    return false
  }

  _checkUniformValueValid (location, value, name, count, type) {
    if (!checkObject(location) ||
      !checkObject(value)) {
      throw new TypeError(`${name}v(WebGLUniformLocation, Array)`)
    } else if (!location) {
      return false
    } else if (!this._checkLocationActive(location)) {
      return false
    } else if (typeof value !== 'object' || !value || typeof value.length !== 'number') {
      throw new TypeError(`Second argument to ${name} must be array`)
    } else if (uniformTypeSize(location._activeInfo.type) > count) {
      this.setError(this.INVALID_OPERATION)
      return false
    } else if (value.length >= count && value.length % count === 0) {
      if (location._array) {
        return true
      } else if (value.length === count) {
        return true
      } else {
        this.setError(this.INVALID_OPERATION)
        return false
      }
    }
    this.setError(this.INVALID_VALUE)
    return false
  }

  uniform1f (location, v0) {
    if (!this._checkUniformValid(location, v0, 'uniform1f', 1, 'f')) return
    super.uniform1f(location._ | 0, v0)
  }

  uniform1fv (location, value) {
    if (!this._checkUniformValueValid(location, value, 'uniform1fv', 1, 'f')) return
    if (location._array) {
      const locs = location._array
      for (let i = 0; i < locs.length && i < value.length; ++i) {
        const loc = locs[i]
        super.uniform1f(loc, value[i])
      }
      return
    }
    super.uniform1f(location._ | 0, value[0])
  }

  uniform1i (location, v0) {
    if (!this._checkUniformValid(location, v0, 'uniform1i', 1, 'i')) return
    super.uniform1i(location._ | 0, v0)
  }

  uniform1iv (location, value) {
    if (!this._checkUniformValueValid(location, value, 'uniform1iv', 1, 'i')) return
    if (location._array) {
      const locs = location._array
      for (let i = 0; i < locs.length && i < value.length; ++i) {
        const loc = locs[i]
        super.uniform1i(loc, value[i])
      }
      return
    }
    this.uniform1i(location, value[0])
  }

  uniform2f (location, v0, v1) {
    if (!this._checkUniformValid(location, v0, 'uniform2f', 2, 'f')) return
    super.uniform2f(location._ | 0, v0, v1)
  }

  uniform2fv (location, value) {
    if (!this._checkUniformValueValid(location, value, 'uniform2fv', 2, 'f')) return
    if (location._array) {
      const locs = location._array
      for (let i = 0; i < locs.length && 2 * i < value.length; ++i) {
        const loc = locs[i]
        super.uniform2f(loc, value[2 * i], value[(2 * i) + 1])
      }
      return
    }
    super.uniform2f(location._ | 0, value[0], value[1])
  }

  uniform2i (location, v0, v1) {
    if (!this._checkUniformValid(location, v0, 'uniform2i', 2, 'i')) return
    super.uniform2i(location._ | 0, v0, v1)
  }

  uniform2iv (location, value) {
    if (!this._checkUniformValueValid(location, value, 'uniform2iv', 2, 'i')) return
    if (location._array) {
      const locs = location._array
      for (let i = 0; i < locs.length && 2 * i < value.length; ++i) {
        const loc = locs[i]
        super.uniform2i(loc, value[2 * i], value[2 * i + 1])
      }
      return
    }
    this.uniform2i(location, value[0], value[1])
  }

  uniform3f (location, v0, v1, v2) {
    if (!this._checkUniformValid(location, v0, 'uniform3f', 3, 'f')) return
    super.uniform3f(location._ | 0, v0, v1, v2)
  }

  uniform3fv (location, value) {
    if (!this._checkUniformValueValid(location, value, 'uniform3fv', 3, 'f')) return
    if (location._array) {
      const locs = location._array
      for (let i = 0; i < locs.length && 3 * i < value.length; ++i) {
        const loc = locs[i]
        super.uniform3f(loc, value[3 * i], value[3 * i + 1], value[3 * i + 2])
      }
      return
    }
    super.uniform3f(location._ | 0, value[0], value[1], value[2])
  }

  uniform3i (location, v0, v1, v2) {
    if (!this._checkUniformValid(location, v0, 'uniform3i', 3, 'i')) return
    super.uniform3i(location._ | 0, v0, v1, v2)
  }

  uniform3iv (location, value) {
    if (!this._checkUniformValueValid(location, value, 'uniform3iv', 3, 'i')) return
    if (location._array) {
      const locs = location._array
      for (let i = 0; i < locs.length && 3 * i < value.length; ++i) {
        const loc = locs[i]
        super.uniform3i(loc, value[3 * i], value[3 * i + 1], value[3 * i + 2])
      }
      return
    }
    this.uniform3i(location, value[0], value[1], value[2])
  }

  uniform4f (location, v0, v1, v2, v3) {
    if (!this._checkUniformValid(location, v0, 'uniform4f', 4, 'f')) return
    super.uniform4f(location._ | 0, v0, v1, v2, v3)
  }

  uniform4fv (location, value) {
    if (!this._checkUniformValueValid(location, value, 'uniform4fv', 4, 'f')) return
    if (location._array) {
      const locs = location._array
      for (let i = 0; i < locs.length && 4 * i < value.length; ++i) {
        const loc = locs[i]
        super.uniform4f(loc, value[4 * i], value[4 * i + 1], value[4 * i + 2], value[4 * i + 3])
      }
      return
    }
    super.uniform4f(location._ | 0, value[0], value[1], value[2], value[3])
  }

  uniform4i (location, v0, v1, v2, v3) {
    if (!this._checkUniformValid(location, v0, 'uniform4i', 4, 'i')) return
    super.uniform4i(location._ | 0, v0, v1, v2, v3)
  }

  uniform4iv (location, value) {
    if (!this._checkUniformValueValid(location, value, 'uniform4iv', 4, 'i')) return
    if (location._array) {
      const locs = location._array
      for (let i = 0; i < locs.length && 4 * i < value.length; ++i) {
        const loc = locs[i]
        super.uniform4i(loc, value[4 * i], value[4 * i + 1], value[4 * i + 2], value[4 * i + 3])
      }
      return
    }
    this.uniform4i(location, value[0], value[1], value[2], value[3])
  }

  _checkUniformMatrix (location, transpose, value, name, count) {
    if (!checkObject(location) ||
      typeof value !== 'object') {
      throw new TypeError(name + '(WebGLUniformLocation, Boolean, Array)')
    } else if (!!transpose ||
      typeof value !== 'object' ||
      value === null ||
      !value.length ||
      value.length % count * count !== 0) {
      this.setError(this.INVALID_VALUE)
      return false
    }
    if (!location) {
      return false
    }
    if (!this._checkLocationActive(location)) {
      return false
    }

    if (value.length === count * count) {
      return true
    } else if (location._array) {
      return true
    }
    this.setError(this.INVALID_VALUE)
    return false
  }

  uniformMatrix2fv (location, transpose, value) {
    if (!this._checkUniformMatrix(location, transpose, value, 'uniformMatrix2fv', 2)) return
    const data = new Float32Array(value)
    super.uniformMatrix2fv(
      location._ | 0,
      !!transpose,
      data)
  }

  uniformMatrix3fv (location, transpose, value) {
    if (!this._checkUniformMatrix(location, transpose, value, 'uniformMatrix3fv', 3)) return
    const data = new Float32Array(value)
    super.uniformMatrix3fv(
      location._ | 0,
      !!transpose,
      data)
  }

  uniformMatrix4fv (location, transpose, value) {
    if (!this._checkUniformMatrix(location, transpose, value, 'uniformMatrix4fv', 4)) return
    const data = new Float32Array(value)
    super.uniformMatrix4fv(
      location._ | 0,
      !!transpose,
      data)
  }

  vertexAttrib1f (index, v0) {
    index |= 0
    if (!this._checkVertexIndex(index)) return
    const data = this._vertexGlobalState._attribs[index]._data
    data[3] = 1
    data[1] = data[2] = 0
    data[0] = v0
    return super.vertexAttrib1f(index | 0, +v0)
  }

  vertexAttrib2f (index, v0, v1) {
    index |= 0
    if (!this._checkVertexIndex(index)) return
    const data = this._vertexGlobalState._attribs[index]._data
    data[3] = 1
    data[2] = 0
    data[1] = v1
    data[0] = v0
    return super.vertexAttrib2f(index | 0, +v0, +v1)
  }

  vertexAttrib3f (index, v0, v1, v2) {
    index |= 0
    if (!this._checkVertexIndex(index)) return
    const data = this._vertexGlobalState._attribs[index]._data
    data[3] = 1
    data[2] = v2
    data[1] = v1
    data[0] = v0
    return super.vertexAttrib3f(index | 0, +v0, +v1, +v2)
  }

  vertexAttrib4f (index, v0, v1, v2, v3) {
    index |= 0
    if (!this._checkVertexIndex(index)) return
    const data = this._vertexGlobalState._attribs[index]._data
    data[3] = v3
    data[2] = v2
    data[1] = v1
    data[0] = v0
    return super.vertexAttrib4f(index | 0, +v0, +v1, +v2, +v3)
  }

  vertexAttrib1fv (index, value) {
    if (typeof value !== 'object' || value === null || value.length < 1) {
      this.setError(this.INVALID_OPERATION)
      return
    }
    const data = this._vertexGlobalState._attribs[index]._data
    data[3] = 1
    data[2] = 0
    data[1] = 0
    data[0] = value[0]
    return super.vertexAttrib1f(index | 0, +value[0])
  }

  vertexAttrib2fv (index, value) {
    if (typeof value !== 'object' || value === null || value.length < 2) {
      this.setError(this.INVALID_OPERATION)
      return
    }
    const data = this._vertexGlobalState._attribs[index]._data
    data[3] = 1
    data[2] = 0
    data[1] = value[1]
    data[0] = value[0]
    return super.vertexAttrib2f(index | 0, +value[0], +value[1])
  }

  vertexAttrib3fv (index, value) {
    if (typeof value !== 'object' || value === null || value.length < 3) {
      this.setError(this.INVALID_OPERATION)
      return
    }
    const data = this._vertexGlobalState._attribs[index]._data
    data[3] = 1
    data[2] = value[2]
    data[1] = value[1]
    data[0] = value[0]
    return super.vertexAttrib3f(index | 0, +value[0], +value[1], +value[2])
  }

  vertexAttrib4fv (index, value) {
    if (typeof value !== 'object' || value === null || value.length < 4) {
      this.setError(this.INVALID_OPERATION)
      return
    }
    const data = this._vertexGlobalState._attribs[index]._data
    data[3] = value[3]
    data[2] = value[2]
    data[1] = value[1]
    data[0] = value[0]
    return super.vertexAttrib4f(index | 0, +value[0], +value[1], +value[2], +value[3])
  }

  _isWebGL2 () {
    return this.TEXTURE_2D_ARRAY !== undefined
  }
}

// Make the gl consts available as static properties
for (const [key, value] of Object.entries(gl)) {
  if (typeof value !== 'number') {
    continue
  }
  Object.assign(WebGLRenderingContextHelper, { [key]: value })
}

class WebGLRenderingContext extends WebGLRenderingContextHelper {}

class WebGL2RenderingContext extends WebGLRenderingContextHelper {}

module.exports = { WebGLRenderingContext, WebGL2RenderingContext, wrapContext }
