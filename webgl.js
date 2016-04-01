'use strict'

var bits = require('bit-twiddle')
var nativeGL = require('bindings')('webgl')
var tokenize = require('glsl-tokenizer/string')

var HEADLESS_VERSION = require('./package.json').version

// These are defined by the WebGL spec
var MAX_UNIFORM_LENGTH = 256
var MAX_ATTRIBUTE_LENGTH = 256

// We need to wrap some of the native WebGL functions to handle certain error codes and check input values
var gl = nativeGL.WebGLRenderingContext.prototype
gl.VERSION = 0x1F02
gl.IMPLEMENTATION_COLOR_READ_TYPE = 0x8B9A
gl.IMPLEMENTATION_COLOR_READ_FORMAT = 0x8B9B

var ATTACHMENTS = [
  gl.COLOR_ATTACHMENT0,
  gl.DEPTH_ATTACHMENT,
  gl.STENCIL_ATTACHMENT,
  gl.DEPTH_STENCIL_ATTACHMENT
]

// Hook clean up
process.on('exit', nativeGL.cleanup)

// Export type boxes for WebGL
exports.WebGLRenderingContext = nativeGL.WebGLRenderingContext

function WebGLProgram (_, ctx) {
  this._ = _
  this._ctx = ctx
  this._linkCount = 0
  this._pendingDelete = false
  this._linkStatus = false
  this._linkInfoLog = 'not linked'
  this._references = []
  this._refCount = 0
  this._attributes = []
  this._uniforms = []
}
exports.WebGLProgram = WebGLProgram

function WebGLShader (_, ctx, type) {
  this._ = _
  this._type = type
  this._ctx = ctx
  this._pendingDelete = false
  this._references = []
  this._refCount = 0
  this._source = ''
  this._compileStatus = false
  this._compileInfo = ''
}
exports.WebGLShader = WebGLShader

function WebGLBuffer (_, ctx) {
  this._ = _
  this._ctx = ctx
  this._binding = 0
  this._size = 0
  this._pendingDelete = false
  this._references = []
  this._refCount = 0
  this._elements = new Uint8Array(0)
}
exports.WebGLBuffer = WebGLBuffer

function WebGLFramebuffer (_, ctx) {
  this._ = _
  this._ctx = ctx
  this._binding = 0
  this._pendingDelete = false
  this._references = []
  this._refCount = 0

  this._width = 0
  this._height = 0

  this._attachments = {}
  this._attachments[gl.COLOR_ATTACHMENT0] = null
  this._attachments[gl.DEPTH_ATTACHMENT] = null
  this._attachments[gl.STENCIL_ATTACHMENT] = null
  this._attachments[gl.DEPTH_STENCIL_ATTACHMENT] = null

  this._attachmentLevel = {}
  this._attachmentLevel[gl.COLOR_ATTACHMENT0] = 0
  this._attachmentLevel[gl.DEPTH_ATTACHMENT] = 0
  this._attachmentLevel[gl.STENCIL_ATTACHMENT] = 0
  this._attachmentLevel[gl.DEPTH_STENCIL_ATTACHMENT] = 0

  this._attachmentFace = {}
  this._attachmentFace[gl.COLOR_ATTACHMENT0] = 0
  this._attachmentFace[gl.DEPTH_ATTACHMENT] = 0
  this._attachmentFace[gl.STENCIL_ATTACHMENT] = 0
  this._attachmentFace[gl.DEPTH_STENCIL_ATTACHMENT] = 0
}
exports.WebGLFramebuffer = WebGLFramebuffer

function WebGLRenderbuffer (_, ctx) {
  this._ = _
  this._ctx = ctx
  this._binding = 0
  this._pendingDelete = false
  this._references = []
  this._refCount = 0
  this._width = 0
  this._height = 0
  this._format = 0
}
exports.WebGLRenderbuffer = WebGLRenderbuffer

function WebGLTexture (_, ctx) {
  this._ = _
  this._ctx = ctx
  this._binding = 0
  this._pendingDelete = false
  this._references = []
  this._refCount = 0
  this._levelWidth = new Int32Array(32)
  this._levelHeight = new Int32Array(32)
  this._format = 0
  this._type = 0
}
exports.WebGLTexture = WebGLTexture

function WebGLActiveInfo (_) {
  this.size = _.size
  this.type = _.type
  this.name = _.name
}
exports.WebGLActiveInfo = WebGLActiveInfo

function WebGLShaderPrecisionFormat (_) {
  this.rangeMin = _.rangeMin
  this.rangeMax = _.rangeMax
  this.precision = _.precision
}
exports.WebGLShaderPrecisionFormat = WebGLShaderPrecisionFormat

function WebGLUniformLocation (_, program, info) {
  this._ = _
  this._program = program
  this._linkCount = program._linkCount
  this._activeInfo = info
  this._array = null
}
exports.WebGLUniformLocation = WebGLUniformLocation

function WebGLContextAttributes (
  alpha,
  depth,
  stencil,
  antialias,
  premultipliedAlpha,
  preserveDrawingBuffer,
  preferLowPowerToHighPerformance,
  failIfMajorPerformanceCaveat) {
  this.alpha = alpha
  this.depth = depth
  this.stencil = stencil
  this.antialias = antialias
  this.premultipliedAlpha = premultipliedAlpha
  this.preserveDrawingBuffer = preserveDrawingBuffer
  this.preferLowPowerToHighPerformance = preferLowPowerToHighPerformance
  this.failIfMajorPerformanceCaveat = failIfMajorPerformanceCaveat
}
exports.WebGLContextAttributes = WebGLContextAttributes

function WebGLVertexAttribute (ctx, idx) {
  this._ctx = ctx
  this._idx = idx
  this._isPointer = false
  this._pointerBuffer = null
  this._pointerOffset = 0
  this._pointerSize = 0
  this._pointerStride = 0
  this._pointerType = gl.FLOAT
  this._pointerNormal = false
  this._inputSize = 4
  this._inputStride = 0
  this._data = new Float32Array([0, 0, 0, 1])
}
exports.WebGLVertexAttribute = WebGLVertexAttribute

function WebGLTextureUnit (ctx, idx) {
  this._ctx = ctx
  this._idx = idx
  this._mode = 0
  this._bind2D = null
  this._bindCube = null
}
exports.WebGLTextureUnit = WebGLTextureUnit

function WebGLDrawingBufferWrapper (
  framebuffer,
  color,
  depthStencil) {
  this._framebuffer = framebuffer
  this._color = color
  this._depthStencil = depthStencil
}
exports.WebGLDrawingBufferWrapper = WebGLDrawingBufferWrapper

function unpackTypedArray (array) {
  return (new Uint8Array(array.buffer)).subarray(
    array.byteOffset,
    array.byteLength + array.byteOffset)
}

// Don't allow: ", $, `, @, \, ', \0
function isValidString (str) {
  // Remove comments first
  var c = str.replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm, '')
  return !(/[\"\$\`\@\\\'\0]/.test(c))
}

function isTypedArray (data) {
  return data instanceof Uint8Array ||
  data instanceof Uint8ClampedArray ||
  data instanceof Int8Array ||
  data instanceof Uint16Array ||
  data instanceof Int16Array ||
  data instanceof Uint32Array ||
  data instanceof Int32Array ||
  data instanceof Float32Array ||
  data instanceof Float64Array
}

function activeTextureUnit (context) {
  return context._textureUnits[context._activeTextureUnit]
}

function activeTexture (context, target) {
  var activeUnit = activeTextureUnit(context)
  if (target === gl.TEXTURE_2D) {
    return activeUnit._bind2D
  } else if (target === gl.TEXTURE_CUBE_MAP) {
    return activeUnit._bindCube
  }
  return null
}

function validCubeTarget (target) {
  return target === gl.TEXTURE_CUBE_MAP_POSITIVE_X ||
  target === gl.TEXTURE_CUBE_MAP_NEGATIVE_X ||
  target === gl.TEXTURE_CUBE_MAP_POSITIVE_Y ||
  target === gl.TEXTURE_CUBE_MAP_NEGATIVE_Y ||
  target === gl.TEXTURE_CUBE_MAP_POSITIVE_Z ||
  target === gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
}

function precheckFramebufferStatus (framebuffer) {
  var attachments = framebuffer._attachments
  var width = []
  var height = []

  var colorAttachment = attachments[gl.COLOR_ATTACHMENT0]
  var depthAttachment = attachments[gl.DEPTH_ATTACHMENT]
  var depthStencilAttachment = attachments[gl.DEPTH_STENCIL_ATTACHMENT]
  var stencilAttachment = attachments[gl.STENCIL_ATTACHMENT]

  if (depthStencilAttachment && (stencilAttachment || depthAttachment) ||
      (stencilAttachment && depthAttachment)) {
    return gl.FRAMEBUFFER_UNSUPPORTED
  }

  if (!colorAttachment) {
    return gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT
  }

  if (depthStencilAttachment instanceof WebGLTexture) {
    return gl.FRAMEBUFFER_UNSUPPORTED
  } else if (depthStencilAttachment instanceof WebGLRenderbuffer) {
    if (depthStencilAttachment._format !== gl.DEPTH_STENCIL) {
      return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT
    }
    width.push(depthStencilAttachment._width)
    height.push(depthStencilAttachment._height)
  }

  if (depthAttachment instanceof WebGLTexture) {
    return gl.FRAMEBUFFER_UNSUPPORTED
  } else if (depthAttachment instanceof WebGLRenderbuffer) {
    if (depthAttachment._format !== gl.DEPTH_COMPONENT16) {
      return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT
    }
    width.push(depthAttachment._width)
    height.push(depthAttachment._height)
  }

  if (stencilAttachment instanceof WebGLTexture) {
    return gl.FRAMEBUFFER_UNSUPPORTED
  } else if (stencilAttachment instanceof WebGLRenderbuffer) {
    if (stencilAttachment._format !== gl.STENCIL_INDEX8) {
      return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT
    }
    width.push(stencilAttachment._width)
    height.push(stencilAttachment._height)
  }

  if (colorAttachment instanceof WebGLTexture) {
    if (colorAttachment._format !== gl.RGBA ||
        colorAttachment._type !== gl.UNSIGNED_BYTE) {
      return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT
    }
    var level = framebuffer._attachmentLevel[gl.COLOR_ATTACHMENT0]
    width.push(colorAttachment._levelWidth[level])
    height.push(colorAttachment._levelHeight[level])
  } else if (colorAttachment instanceof WebGLRenderbuffer) {
    var format = colorAttachment._format
    if (format !== gl.RGBA4 &&
      format !== gl.RGB565 &&
      format !== gl.RGB5_A1) {
      return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT
    }
    width.push(colorAttachment._width)
    height.push(colorAttachment._height)
  }

  if (!colorAttachment &&
      !stencilAttachment &&
      !depthAttachment &&
      !depthStencilAttachment) {
    return gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT
  }

  if (width.length <= 0 || height.length <= 0) {
    return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT
  }

  for (var i = 1; i < width.length; ++i) {
    if (width[i - 1] !== width[i] ||
        height[i - 1] !== height[i]) {
      return gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS
    }
  }

  if (width[0] === 0 || height[0] === 0) {
    return gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT
  }

  framebuffer._width = width[0]
  framebuffer._height = height[0]

  return gl.FRAMEBUFFER_COMPLETE
}

function framebufferOk (context) {
  var framebuffer = context._activeFramebuffer
  if (framebuffer &&
    precheckFramebufferStatus(framebuffer) !== gl.FRAMEBUFFER_COMPLETE) {
    setError(context, gl.INVALID_FRAMEBUFFER_OPERATION)
    return false
  }
  return true
}

function getTexImage (context, target) {
  var unit = activeTextureUnit(context)
  if (target === gl.TEXTURE_2D) {
    return unit._bind2D
  } else if (validCubeTarget(target)) {
    return unit._bindCube
  }
  setError(context, gl.INVALID_ENUM)
  return null
}

function checkObject (object) {
  return typeof object === 'object' ||
  (object === void 0)
}

function validFramebufferAttachment (attachment) {
  return attachment === gl.COLOR_ATTACHMENT0 ||
  attachment === gl.DEPTH_ATTACHMENT ||
  attachment === gl.STENCIL_ATTACHMENT ||
  attachment === gl.DEPTH_STENCIL_ATTACHMENT
}

function validTextureTarget (target) {
  return target === gl.TEXTURE_2D ||
  target === gl.TEXTURE_CUBE_MAP
}

function checkTextureTarget (context, target) {
  var unit = activeTextureUnit(context)
  var tex = null
  if (target === gl.TEXTURE_2D) {
    tex = unit._bind2D
  } else if (target === gl.TEXTURE_CUBE_MAP) {
    tex = unit._bindCube
  } else {
    setError(context, gl.INVALID_ENUM)
    return false
  }
  if (!tex) {
    setError(context, gl.INVALID_OPERATION)
    return false
  }
  return true
}

function typeSize (type) {
  switch (type) {
    case gl.UNSIGNED_BYTE:
    case gl.BYTE:
      return 1
    case gl.UNSIGNED_SHORT:
    case gl.SHORT:
      return 2
    case gl.UNSIGNED_INT:
    case gl.INT:
    case gl.FLOAT:
      return 4
  }
  return 0
}

function formatSize (internalformat) {
  switch (internalformat) {
    case gl.ALPHA:
    case gl.LUMINANCE:
      return 1
    case gl.LUMINANCE_ALPHA:
      return 2
    case gl.RGB:
      return 3
    case gl.RGBA:
      return 4
  }
  return 0
}

function vertexCount (primitive, count) {
  switch (primitive) {
    case gl.TRIANGLES:
      return count - (count % 3)
    case gl.LINES:
      return count - (count % 2)
    case gl.LINE_LOOP:
    case gl.POINTS:
      return count
    case gl.TRIANGLE_FAN:
    case gl.LINE_STRIP:
      if (count < 2) {
        return 0
      }
      return count
    case gl.TRIANGLE_STRIP:
      if (count < 3) {
        return 0
      }
      return count
    default:
      return -1
  }
}

function link (a, b) {
  a._references.push(b)
  b._refCount += 1
  return true
}

function unlink (a, b) {
  var idx = a._references.indexOf(b)
  if (idx < 0) {
    return false
  }
  while (idx >= 0) {
    a._references[idx] = a._references[a._references.length - 1]
    a._references.pop()
    b._refCount -= 1
    checkDelete(b)
    idx = a._references.indexOf(b)
  }
  return true
}

function linked (a, b) {
  return a._references.indexOf(b) >= 0
}

function checkDelete (obj) {
  if (obj._refCount <= 0 &&
    obj._pendingDelete &&
    obj._ !== 0) {
    while (obj._references.length > 0) {
      unlink(obj, obj._references[0])
    }
    obj._performDelete()
    obj._ = 0
  }
}

function setError (context, error) {
  nativeGL.setError.call(context, error | 0)
}

function checkValid (object, type) {
  return object instanceof type && object._ !== 0
}

function checkOwns (context, object) {
  return typeof object === 'object' &&
  object._ctx === context
}

function checkUniform (program, location) {
  return location instanceof WebGLUniformLocation &&
  location._program === program &&
  location._linkCount === program._linkCount
}

function checkLocation (context, location) {
  if (!(location instanceof WebGLUniformLocation)) {
    setError(context, gl.INVALID_VALUE)
    return false
  } else if (location._program._ctx !== context ||
    location._linkCount !== location._program._linkCount) {
    setError(context, gl.INVALID_OPERATION)
    return false
  }
  return true
}

function checkLocationActive (context, location) {
  if (!location) {
    return false
  } else if (!checkLocation(context, location)) {
    return false
  } else if (location._program !== context._activeProgram) {
    setError(context, gl.INVALID_OPERATION)
    return false
  }
  return true
}

function checkWrapper (context, object, wrapper) {
  if (!checkValid(object, wrapper)) {
    setError(context, gl.INVALID_VALUE)
    return false
  } else if (!checkOwns(context, object)) {
    setError(context, gl.INVALID_OPERATION)
    return false
  }
  return true
}

function saveError (context) {
  context._errorStack.push(context.getError())
}

function restoreError (context, lastError) {
  var topError = context._errorStack.pop()
  if (topError === gl.NO_ERROR) {
    setError(context, lastError)
  } else {
    setError(context, topError)
  }
}

function getActiveBuffer (context, target) {
  if (target === gl.ARRAY_BUFFER) {
    return context._activeArrayBuffer
  } else if (target === gl.ELEMENT_ARRAY_BUFFER) {
    return context._activeElementArrayBuffer
  }
  return null
}

function checkVertexAttribState (context, maxIndex) {
  var program = context._activeProgram
  if (!program) {
    setError(context, gl.INVALID_OPERATION)
    return false
  }
  var attribs = context._vertexAttribs
  for (var i = 0; i < attribs.length; ++i) {
    var attrib = attribs[i]
    if (attrib._isPointer) {
      var buffer = attrib._pointerBuffer
      if (!buffer) {
        setError(context, gl.INVALID_OPERATION)
        return false
      }
      if (program._attributes.indexOf(i) >= 0) {
        var maxByte = attrib._pointerStride * maxIndex +
        attrib._pointerSize +
        attrib._pointerOffset
        if (maxByte > buffer._size) {
          setError(context, gl.INVALID_OPERATION)
          return false
        }
      }
    }
  }
  return true
}

function clearFramebufferAttachment (framebuffer, attachment) {
  var object = framebuffer._attachments[attachment]
  if (!object) {
    return
  }
  framebuffer._attachments[attachment] = null
  unlink(framebuffer, object)
}

function setFramebufferAttachment (framebuffer, object, attachment) {
  var prevObject = framebuffer._attachments[attachment]
  if (prevObject === object) {
    return
  }

  clearFramebufferAttachment(framebuffer, attachment)
  if (!object) {
    return
  }

  framebuffer._attachments[attachment] = object
  link(framebuffer, object)
}

gl.resize = function (width, height) {
  width = width | 0
  height = height | 0
  if (!(width > 0 && height > 0)) {
    throw new Error('Invalid surface dimensions')
  } else if (width !== this.drawingBufferWidth ||
    height !== this.drawingBufferHeight) {
    resizeDrawingBuffer(this, width, height)
    this.drawingBufferWidth = width
    this.drawingBufferHeight = height
  }
}

var _destroy = gl.destroy
gl.destroy = function () {
  _destroy.call(this)
}

gl.getContextAttributes = function () {
  return this._contextattributes
}

// var _getSupportedExtensions = gl.getSupportedExtensions
gl.getSupportedExtensions = function getSupportedExtensions () {
  // TODO
  return []
}

// var _getExtension = gl.getExtension
gl.getExtension = function getExtension (name) {
  // TODO
  return null
}

var _activeTexture = gl.activeTexture
gl.activeTexture = function activeTexture (texture) {
  texture |= 0
  var texNum = texture - gl.TEXTURE0
  if (texNum >= 0 && texNum < this._textureUnits.length) {
    this._activeTextureUnit = texNum
    return _activeTexture.call(this, texture)
  }
  setError(this, gl.INVALID_ENUM)
}

var _attachShader = gl.attachShader
gl.attachShader = function attachShader (program, shader) {
  if (!checkObject(program) ||
    !checkObject(shader)) {
    throw new TypeError('attachShader(WebGLProgram, WebGLShader)')
  }
  if (!program || !shader) {
    setError(this, gl.INVALID_VALUE)
    return
  } else if (program instanceof WebGLProgram &&
    shader instanceof WebGLShader &&
    checkOwns(this, program) &&
    checkOwns(this, shader)) {
    if (!linked(program, shader)) {
      saveError(this)
      _attachShader.call(
        this,
        program._ | 0,
        shader._ | 0)
      var error = this.getError()
      restoreError(this, error)
      if (error === gl.NO_ERROR) {
        link(program, shader)
      }
      return
    }
  }
  setError(this, gl.INVALID_OPERATION)
}

var _bindAttribLocation = gl.bindAttribLocation
gl.bindAttribLocation = function bindAttribLocation (program, index, name) {
  if (!checkObject(program) ||
    typeof name !== 'string') {
    throw new TypeError('bindAttribLocation(WebGLProgram, GLint, String)')
  }
  name += ''
  if (!isValidString(name) || name.length > MAX_ATTRIBUTE_LENGTH) {
    setError(this, gl.INVALID_VALUE)
    return
  } else if (/^_?webgl_a/.test(name)) {
    setError(this, gl.INVALID_OPERATION)
    return
  } else if (checkWrapper(this, program, WebGLProgram)) {
    return _bindAttribLocation.call(
      this,
      program._ | 0,
      index | 0,
      name)
  }
}

function switchActiveBuffer (active, buffer) {
  if (active !== buffer) {
    if (active) {
      active._refCount -= 1
      checkDelete(active)
    }
    if (buffer) {
      buffer._refCount += 1
    }
  }
}

var _bindBuffer = gl.bindBuffer
gl.bindBuffer = function bindBuffer (target, buffer) {
  target |= 0
  if (!checkObject(buffer)) {
    throw new TypeError('bindBuffer(GLenum, WebGLBuffer)')
  }
  if (target !== gl.ARRAY_BUFFER &&
    target !== gl.ELEMENT_ARRAY_BUFFER) {
    setError(this, gl.INVALID_ENUM)
    return
  }

  if (!buffer) {
    _bindBuffer.call(this, target, 0)
  } else if (buffer._pendingDelete) {
    return
  } else if (checkWrapper(this, buffer, WebGLBuffer)) {
    if (buffer._binding && buffer._binding !== target) {
      setError(this, gl.INVALID_OPERATION)
      return
    }
    buffer._binding = target | 0

    _bindBuffer.call(this, target, buffer._ | 0)
  } else {
    return
  }

  if (target === gl.ARRAY_BUFFER) {
    switchActiveBuffer(this._activeArrayBuffer, buffer)
    this._activeArrayBuffer = buffer
  } else {
    switchActiveBuffer(this._activeElementArrayBuffer, buffer)
    this._activeElementArrayBuffer = buffer
  }
}

var _bindRenderbuffer = gl.bindRenderbuffer
gl.bindRenderbuffer = function (target, object) {
  if (!checkObject(object)) {
    throw new TypeError('bindRenderbuffer(GLenum, WebGLRenderbuffer)')
  }

  if (target !== gl.RENDERBUFFER) {
    setError(this, gl.INVALID_ENUM)
    return
  }

  if (!object) {
    _bindRenderbuffer.call(
      this,
      target | 0,
      0)
  } else if (object._pendingDelete) {
    return
  } else if (checkWrapper(this, object, WebGLRenderbuffer)) {
    _bindRenderbuffer.call(
      this,
      target | 0,
      object._ | 0)
  } else {
    return
  }
  var active = this._activeRenderbuffer
  if (active !== object) {
    if (active) {
      active._refCount -= 1
      checkDelete(active)
    }
    if (object) {
      object._refCount += 1
    }
  }
  this._activeRenderbuffer = object
}

var _bindFramebuffer = gl.bindFramebuffer
gl.bindFramebuffer = function bindFramebuffer (target, framebuffer) {
  if (!checkObject(framebuffer)) {
    throw new TypeError('bindFramebuffer(GLenum, WebGLFramebuffer)')
  }
  if (target !== gl.FRAMEBUFFER) {
    setError(this, gl.INVALID_ENUM)
    return
  }
  if (!framebuffer) {
    _bindFramebuffer.call(
      this,
      gl.FRAMEBUFFER,
      this._drawingBuffer._framebuffer)
  } else if (framebuffer._pendingDelete) {
    return
  } else if (checkWrapper(this, framebuffer, WebGLFramebuffer)) {
    _bindFramebuffer.call(
      this,
      gl.FRAMEBUFFER,
      framebuffer._ | 0)
  } else {
    return
  }
  var activeFramebuffer = this._activeFramebuffer
  if (activeFramebuffer !== framebuffer) {
    if (activeFramebuffer) {
      activeFramebuffer._refCount -= 1
      checkDelete(activeFramebuffer)
    }
    if (framebuffer) {
      framebuffer._refCount += 1
    }
  }
  this._activeFramebuffer = framebuffer
  if (framebuffer) {
    updateFramebufferAttachments(framebuffer)
  }
}

var _bindTexture = gl.bindTexture
gl.bindTexture = function bindTexture (target, texture) {
  target |= 0

  if (!checkObject(texture)) {
    throw new TypeError('bindTexture(GLenum, WebGLTexture)')
  }

  if (!validTextureTarget(target)) {
    setError(this, gl.INVALID_ENUM)
    return
  }

  // Get texture id
  var texture_id = 0
  if (!texture) {
    texture = null
  } else if (texture instanceof WebGLTexture &&
    texture._pendingDelete) {
    // Special case: error codes for deleted textures don't get set for some dumb reason
    return
  } else if (checkWrapper(this, texture, WebGLTexture)) {
    // Check binding mode of texture
    if (texture._binding && texture._binding !== target) {
      setError(this, gl.INVALID_OPERATION)
      return
    }
    texture._binding = target

    texture_id = texture._ | 0
  } else {
    return
  }

  saveError(this)
  _bindTexture.call(
    this,
    target,
    texture_id)
  var error = this.getError()
  restoreError(this, error)

  if (error !== gl.NO_ERROR) {
    return
  }

  var activeUnit = activeTextureUnit(this)
  var activeTex = activeTexture(this, target)

  // Update references
  if (activeTex !== texture) {
    if (activeTex) {
      activeTex._refCount -= 1
      checkDelete(activeTex)
    }
    if (texture) {
      texture._refCount += 1
    }
  }

  if (target === gl.TEXTURE_2D) {
    activeUnit._bind2D = texture
  } else if (target === gl.TEXTURE_CUBE_MAP) {
    activeUnit._bindCube = texture
  }
}

var _blendColor = gl.blendColor
gl.blendColor = function blendColor (red, green, blue, alpha) {
  return _blendColor.call(this, +red, +green, +blue, +alpha)
}

function validBlendMode (mode) {
  return mode === gl.FUNC_ADD ||
  mode === gl.FUNC_SUBTRACT ||
  mode === gl.FUNC_REVERSE_SUBTRACT
}

var _blendEquation = gl.blendEquation
gl.blendEquation = function blendEquation (mode) {
  mode |= 0
  if (validBlendMode(mode)) {
    return _blendEquation.call(this, mode)
  }
  setError(this, gl.INVALID_ENUM)
}

var _blendEquationSeparate = gl.blendEquationSeparate
gl.blendEquationSeparate = function blendEquationSeparate (modeRGB, modeAlpha) {
  modeRGB |= 0
  modeAlpha |= 0
  if (validBlendMode(modeRGB) && validBlendMode(modeAlpha)) {
    return _blendEquationSeparate.call(this, modeRGB, modeAlpha)
  }
  setError(this, gl.INVALID_ENUM)
}

function validBlendFunc (factor) {
  return factor === gl.ZERO ||
    factor === gl.ONE ||
    factor === gl.SRC_COLOR ||
    factor === gl.ONE_MINUS_SRC_COLOR ||
    factor === gl.DST_COLOR ||
    factor === gl.ONE_MINUS_DST_COLOR ||
    factor === gl.SRC_ALPHA ||
    factor === gl.ONE_MINUS_SRC_ALPHA ||
    factor === gl.DST_ALPHA ||
    factor === gl.ONE_MINUS_DST_ALPHA ||
    factor === gl.SRC_ALPHA_SATURATE ||
    factor === gl.CONSTANT_COLOR ||
    factor === gl.ONE_MINUS_CONSTANT_COLOR ||
    factor === gl.CONSTANT_ALPHA ||
    factor === gl.ONE_MINUS_CONSTANT_ALPHA
}

function isConstantBlendFunc (factor) {
  return (
    factor === gl.ZERO ||
    factor === gl.ONE ||
    factor === gl.CONSTANT_COLOR ||
    factor === gl.ONE_MINUS_CONSTANT_COLOR ||
    factor === gl.CONSTANT_ALPHA ||
    factor === gl.ONE_MINUS_CONSTANT_ALPHA)
}

var _blendFunc = gl.blendFunc
gl.blendFunc = function blendFunc (sfactor, dfactor) {
  sfactor |= 0
  dfactor |= 0
  if (!validBlendFunc(sfactor) ||
    !validBlendFunc(dfactor)) {
    setError(this, gl.INVALID_ENUM)
    return
  }
  if (isConstantBlendFunc(sfactor) && isConstantBlendFunc(dfactor)) {
    setError(this, gl.INVALID_OPERATION)
    return
  }
  _blendFunc.call(this, sfactor, dfactor)
}

var _blendFuncSeparate = gl.blendFuncSeparate
gl.blendFuncSeparate = function blendFuncSeparate (
  srcRGB,
  dstRGB,
  srcAlpha,
  dstAlpha) {
  srcRGB |= 0
  dstRGB |= 0
  srcAlpha |= 0
  dstAlpha |= 0

  if (!(validBlendFunc(srcRGB) &&
        validBlendFunc(dstRGB) &&
        validBlendFunc(srcAlpha) &&
        validBlendFunc(dstAlpha))) {
    setError(this, gl.INVALID_ENUM)
    return
  }

  if ((isConstantBlendFunc(srcRGB) && isConstantBlendFunc(dstRGB)) ||
      (isConstantBlendFunc(srcAlpha) && isConstantBlendFunc(dstAlpha))) {
    setError(this, gl.INVALID_OPERATION)
    return
  }

  _blendFuncSeparate.call(
    this,
    srcRGB,
    dstRGB,
    srcAlpha,
    dstAlpha)
}

var _bufferData = gl.bufferData
gl.bufferData = function bufferData (target, data, usage) {
  target |= 0
  usage |= 0
  if (usage !== gl.STREAM_DRAW &&
    usage !== gl.STATIC_DRAW &&
    usage !== gl.DYNAMIC_DRAW) {
    setError(this, gl.INVALID_ENUM)
    return
  }

  if (target !== gl.ARRAY_BUFFER &&
    target !== gl.ELEMENT_ARRAY_BUFFER) {
    setError(this, gl.INVALID_ENUM)
    return
  }

  var active = getActiveBuffer(this, target)
  if (!active) {
    setError(this, gl.INVALID_OPERATION)
    return
  }

  if (typeof data === 'object') {
    var u8Data = null
    if (isTypedArray(data)) {
      u8Data = unpackTypedArray(data)
    } else if (data instanceof ArrayBuffer) {
      u8Data = new Uint8Array(data)
    } else {
      setError(this, gl.INVALID_VALUE)
      return
    }

    saveError(this)
    _bufferData.call(
      this,
      target,
      u8Data,
      usage)
    var error = this.getError()
    restoreError(this, error)
    if (error !== gl.NO_ERROR) {
      return
    }

    active._size = u8Data.length
    if (target === gl.ELEMENT_ARRAY_BUFFER) {
      active._elements = new Uint8Array(u8Data)
    }

    return
  } else if (typeof data === 'number') {
    var size = data | 0
    if (size < 0) {
      setError(this, gl.INVALID_VALUE)
      return
    }

    saveError(this)
    _bufferData.call(
      this,
      target,
      size,
      usage)
    error = this.getError()
    restoreError(this, error)
    if (error !== gl.NO_ERROR) {
      return
    }

    active._size = size
    if (target === gl.ELEMENT_ARRAY_BUFFER) {
      active._elements = new Uint8Array(size)
    }

    return
  } else {
    setError(this, gl.INVALID_VALUE)
    return
  }
}

var _bufferSubData = gl.bufferSubData
gl.bufferSubData = function bufferSubData (target, offset, data) {
  target |= 0
  offset |= 0

  if (target !== gl.ARRAY_BUFFER &&
    target !== gl.ELEMENT_ARRAY_BUFFER) {
    setError(this, gl.INVALID_ENUM)
    return
  }

  if (data === null) {
    return
  }

  if (!data || typeof data !== 'object') {
    setError(this, gl.INVALID_VALUE)
    return
  }

  var active = getActiveBuffer(this, target)
  if (!active) {
    setError(this, gl.INVALID_OPERATION)
    return
  }

  if (offset < 0 || offset >= active._size) {
    setError(this, gl.INVALID_VALUE)
    return
  }

  var u8Data = null
  if (isTypedArray(data)) {
    u8Data = unpackTypedArray(data)
  } else if (data instanceof ArrayBuffer) {
    u8Data = new Uint8Array(data)
  } else {
    setError(this, gl.INVALID_VALUE)
    return
  }

  if (offset + u8Data.length > active._size) {
    setError(this, gl.INVALID_OPERATION)
    return
  }

  if (target === gl.ELEMENT_ARRAY_BUFFER) {
    active._elements.set(u8Data, offset)
  }

  _bufferSubData.call(
    this,
    target,
    offset,
    u8Data)
}

gl.checkFramebufferStatus = function checkFramebufferStatus (target) {
  if (target !== gl.FRAMEBUFFER) {
    setError(this, gl.INVALID_ENUM)
    return 0
  }

  var framebuffer = this._activeFramebuffer
  if (!framebuffer) {
    return gl.FRAMEBUFFER_COMPLETE
  }

  return precheckFramebufferStatus(framebuffer)
}

var _clear = gl.clear
gl.clear = function clear (mask) {
  if (!framebufferOk(this)) {
    return
  }
  return _clear.call(this, mask | 0)
}

var _clearColor = gl.clearColor
gl.clearColor = function clearColor (red, green, blue, alpha) {
  return _clearColor.call(this, +red, +green, +blue, +alpha)
}

var _clearDepth = gl.clearDepth
gl.clearDepth = function clearDepth (depth) {
  return _clearDepth.call(this, +depth)
}

var _clearStencil = gl.clearStencil
gl.clearStencil = function clearStencil (s) {
  return _clearStencil.call(this, s | 0)
}

var _colorMask = gl.colorMask
gl.colorMask = function colorMask (red, green, blue, alpha) {
  return _colorMask.call(this, !!red, !!green, !!blue, !!alpha)
}

var _compileShader = gl.compileShader

function validGLSLIdentifier (str) {
  if (str.indexOf('webgl_') === 0 ||
    str.indexOf('_webgl_') === 0 ||
    str.length > 256) {
    return false
  }
  return true
}

function checkShaderSource (context, shader) {
  var source = shader._source
  var tokens = tokenize(source)

  var errorStatus = false
  var errorLog = []

  for (var i = 0; i < tokens.length; ++i) {
    var tok = tokens[i]
    switch (tok.type) {
      case 'ident':
        if (!validGLSLIdentifier(tok.data)) {
          errorStatus = true
          errorLog.push(tok.line + ':' + tok.column +
            ' invalid identifier - ' + tok.data)
        }
        break
      case 'preprocessor':
        var bodyToks = tokenize(tok.data.match(/^\s*\#\s*(.*)$/)[1])
        for (var j = 0; j < bodyToks.length; ++j) {
          var btok = bodyToks[j]
          if (btok.type === 'ident' || btok.type === void 0) {
            if (!validGLSLIdentifier(btok.data)) {
              errorStatus = true
              errorLog.push(tok.line + ':' + btok.column +
                ' invalid identifier - ' + btok.data)
            }
          }
        }
        break
      case 'keyword':
        switch (tok.data) {
          case 'do':
            errorStatus = true
            errorLog.push(tok.line + ':' + tok.column + ' do not supported')
            break
        }
        break
    }
  }

  if (errorStatus) {
    shader._compileInfo = errorLog.join('\n')
  }
  return !errorStatus
}

gl.compileShader = function compileShader (shader) {
  if (!checkObject(shader)) {
    throw new TypeError('compileShader(WebGLShader)')
  }
  if (checkWrapper(this, shader, WebGLShader) &&
    checkShaderSource(this, shader)) {
    var prevError = this.getError()
    _compileShader.call(this, shader._ | 0)
    var error = this.getError()
    shader._compileStatus = !!_getShaderParameter.call(
        this,
        shader._ | 0,
        gl.COMPILE_STATUS)
    shader._compileInfo = _getShaderInfoLog.call(
      this,
      shader._ | 0)
    this.getError()
    setError(this, prevError || error)
  }
}

var _copyTexImage2D = gl.copyTexImage2D
gl.copyTexImage2D = function copyTexImage2D (
  target,
  level,
  internalformat,
  x, y, width, height,
  border) {
  target |= 0
  level |= 0
  internalformat |= 0
  x |= 0
  y |= 0
  width |= 0
  height |= 0
  border |= 0

  var texture = getTexImage(this, target)
  if (!texture) {
    setError(this, gl.INVALID_OPERATION)
    return
  }

  if (internalformat !== gl.RGBA &&
      internalformat !== gl.RGB &&
      internalformat !== gl.ALPHA &&
      internalformat !== gl.LUMINANCE &&
      internalformat !== gl.LUMINANCE_ALPHA) {
    setError(this, gl.INVALID_ENUM)
    return
  }

  if (level < 0 || width < 0 || height < 0 || border !== 0) {
    setError(this, gl.INVALID_VALUE)
    return
  }

  if (level > 0 && !(bits.isPow2(width) && bits.isPow2(height))) {
    setError(this, gl.INVALID_VALUE)
    return
  }

  saveError(this)
  _copyTexImage2D.call(
    this,
    target,
    level,
    internalformat,
    x,
    y,
    width,
    height,
    border)
  var error = this.getError()
  restoreError(this, error)

  if (error === gl.NO_ERROR) {
    texture._levelWidth[level] = width
    texture._levelHeight[level] = height
    texture._format = gl.RGBA
    texture._type = gl.UNSIGNED_BYTE
  }
}

var _copyTexSubImage2D = gl.copyTexSubImage2D
gl.copyTexSubImage2D = function copyTexSubImage2D (
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

  var texture = getTexImage(this, target)
  if (!texture) {
    setError(this, gl.INVALID_OPERATION)
    return
  }

  if (width < 0 || height < 0 || xoffset < 0 || yoffset < 0 || level < 0) {
    setError(this, gl.INVALID_VALUE)
    return
  }

  _copyTexSubImage2D.call(
    this,
    target,
    level,
    xoffset,
    yoffset,
    x,
    y,
    width,
    height)
}

var _cullFace = gl.cullFace
gl.cullFace = function cullFace (mode) {
  return _cullFace.call(this, mode | 0)
}

// Object constructor methods
function createObject (method, Wrapper, refset) {
  var native = gl[method]
  gl[method] = function () {
    var id = native.call(this)
    if (id <= 0) {
      return null
    } else {
      var result = new Wrapper(id, this)
      this[refset][id] = result
      return result
    }
  }
}

var _createFramebuffer = gl.createFramebuffer
var _createRenderbuffer = gl.createRenderbuffer
var _createTexture = gl.createTexture
createObject('createBuffer', WebGLBuffer, '_buffers')
createObject('createFramebuffer', WebGLFramebuffer, '_framebuffers')
createObject('createProgram', WebGLProgram, '_programs')
createObject('createRenderbuffer', WebGLRenderbuffer, '_renderbuffers')
createObject('createTexture', WebGLTexture, '_textures')

var _createShader = gl.createShader
gl.createShader = function (type) {
  type |= 0
  if (type !== gl.FRAGMENT_SHADER &&
    type !== gl.VERTEX_SHADER) {
    setError(this, gl.INVALID_ENUM)
    return null
  }
  var id = _createShader.call(this, type)
  if (id < 0) {
    return null
  }
  var result = new WebGLShader(id, this, type)
  this._shaders[id] = result
  return result
}

// Generic object deletion method
function deleteObject (name, type, refset) {
  var native = gl[name]

  type.prototype._performDelete = function () {
    var ctx = this._ctx
    delete ctx[refset][this._ | 0]
    native.call(ctx, this._ | 0)
  }

  gl[name] = function (object) {
    if (!checkObject(object)) {
      throw new TypeError(name + '(' + type.name + ')')
    }
    if (object instanceof type &&
      checkOwns(this, object)) {
      object._pendingDelete = true
      checkDelete(object)
      return
    }
    setError(this, gl.INVALID_OPERATION)
  }
}

deleteObject('deleteProgram', WebGLProgram, '_programs')
deleteObject('deleteShader', WebGLShader, '_shaders')

var _deleteBuffer = gl.deleteBuffer
WebGLBuffer.prototype._performDelete = function () {
  var ctx = this._ctx
  delete ctx._buffers[this._ | 0]
  _deleteBuffer.call(ctx, this._ | 0)
}

gl.deleteBuffer = function deleteBuffer (buffer) {
  if (!checkObject(buffer) ||
    (buffer !== null && !(buffer instanceof WebGLBuffer))) {
    throw new TypeError('deleteBuffer(WebGLBuffer)')
  }

  if (!(buffer instanceof WebGLBuffer &&
    checkOwns(this, buffer))) {
    setError(this, gl.INVALID_OPERATION)
    return
  }

  if (this._activeArrayBuffer === buffer) {
    this.bindBuffer(gl.ARRAY_BUFFER, null)
  }
  if (this._activeElementArrayBuffer === buffer) {
    this.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)
  }

  for (var i = 0; i < this._vertexAttribs.length; ++i) {
    var attrib = this._vertexAttribs[i]
    if (attrib._pointerBuffer === buffer) {
      attrib._pointerBuffer = null
      attrib._pointerStride = 0
      attrib._pointerOffset = 0
      attrib._pointerSize = 4
      buffer._refCount -= 1
    }
  }

  buffer._pendingDelete = true
  checkDelete(buffer)
}

var _deleteFramebuffer = gl.deleteFramebuffer
WebGLFramebuffer.prototype._performDelete = function () {
  var ctx = this._ctx
  delete ctx._framebuffers[this._ | 0]
  _deleteFramebuffer.call(ctx, this._ | 0)
}

gl.deleteFramebuffer = function deleteFramebuffer (framebuffer) {
  if (!checkObject(framebuffer)) {
    throw new TypeError('deleteFramebuffer(WebGLFramebuffer)')
  }

  if (!(framebuffer instanceof WebGLFramebuffer &&
    checkOwns(this, framebuffer))) {
    setError(this, gl.INVALID_OPERATION)
    return
  }

  if (this._activeFramebuffer === framebuffer) {
    this.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  framebuffer._pendingDelete = true
  checkDelete(framebuffer)
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
var _deleteRenderbuffer = gl.deleteRenderbuffer
WebGLRenderbuffer.prototype._performDelete = function () {
  var ctx = this._ctx
  delete ctx._renderbuffers[this._ | 0]
  _deleteRenderbuffer.call(ctx, this._ | 0)
}

gl.deleteRenderbuffer = function deleteRenderbuffer (renderbuffer) {
  if (!checkObject(renderbuffer)) {
    throw new TypeError('deleteRenderbuffer(WebGLRenderbuffer)')
  }

  if (!(renderbuffer instanceof WebGLRenderbuffer &&
    checkOwns(this, renderbuffer))) {
    setError(this, gl.INVALID_OPERATION)
    return
  }

  if (this._activeRenderbuffer === renderbuffer) {
    this.bindRenderbuffer(gl.RENDERBUFFER, null)
  }

  var ctx = this
  var activeFramebuffer = this._activeFramebuffer
  function tryDetach (framebuffer) {
    if (framebuffer && linked(framebuffer, renderbuffer)) {
      var attachments = Object.keys(framebuffer._attachments)
      for (var i = 0; i < attachments.length; ++i) {
        if (framebuffer._attachments[ATTACHMENTS[i]] === renderbuffer) {
          ctx.framebufferTexture2D(
            gl.FRAMEBUFFER,
            ATTACHMENTS[i] | 0,
            gl.TEXTURE_2D,
            null)
        }
      }
    }
  }

  tryDetach(activeFramebuffer)

  renderbuffer._pendingDelete = true
  checkDelete(renderbuffer)
}

var _deleteTexture = gl.deleteTexture
WebGLTexture.prototype._performDelete = function () {
  var ctx = this._ctx
  delete ctx._textures[this._ | 0]
  _deleteTexture.call(ctx, this._ | 0)
}

gl.deleteTexture = function deleteTexture (texture) {
  if (!checkObject(texture)) {
    throw new TypeError('deleteTexture(WebGLTexture)')
  }

  if (texture instanceof WebGLTexture) {
    if (!checkOwns(this, texture)) {
      setError(this, gl.INVALID_OPERATION)
      return
    }
  } else {
    return
  }

  // Unbind from all texture units
  var curActive = this._activeTextureUnit

  for (var i = 0; i < this._textureUnits.length; ++i) {
    var unit = this._textureUnits[i]
    if (unit._bind2D === texture) {
      this.activeTexture(gl.TEXTURE0 + i)
      this.bindTexture(gl.TEXTURE_2D, null)
    } else if (unit._bindCube === texture) {
      this.activeTexture(gl.TEXTURE0 + i)
      this.bindTexture(gl.TEXTURE_CUBE_MAP, null)
    }
  }
  this.activeTexture(gl.TEXTURE0 + curActive)

  // FIXME: Does the texture get unbound from *all* framebuffers, or just the
  // active FBO?
  var ctx = this
  var activeFramebuffer = this._activeFramebuffer

  function tryDetach (framebuffer) {
    if (framebuffer && linked(framebuffer, texture)) {
      for (var i = 0; i < ATTACHMENTS.length; ++i) {
        var attachment = ATTACHMENTS[i]
        if (framebuffer._attachments[attachment] === texture) {
          ctx.framebufferTexture2D(
            gl.FRAMEBUFFER,
            attachment,
            gl.TEXTURE_2D,
            null)
        }
      }
    }
  }

  tryDetach(activeFramebuffer)

  // Mark texture for deletion
  texture._pendingDelete = true

  checkDelete(texture)
}

var _depthFunc = gl.depthFunc
gl.depthFunc = function depthFunc (func) {
  func |= 0
  switch (func) {
    case gl.NEVER:
    case gl.LESS:
    case gl.EQUAL:
    case gl.LEQUAL:
    case gl.GREATER:
    case gl.NOTEQUAL:
    case gl.GEQUAL:
    case gl.ALWAYS:
      return _depthFunc.call(this, func)
    default:
      setError(this, gl.INVALID_ENUM)
      return
  }
}

var _depthMask = gl.depthMask
gl.depthMask = function depthMask (flag) {
  return _depthMask.call(this, !!flag)
}

var _depthRange = gl.depthRange
gl.depthRange = function depthRange (zNear, zFar) {
  zNear = +zNear
  zFar = +zFar
  if (zNear <= zFar) {
    return _depthRange.call(this, zNear, zFar)
  }
  setError(this, gl.INVALID_OPERATION)
}

var _detachShader = gl.detachShader
gl.detachShader = function detachShader (program, shader) {
  if (!checkObject(program) ||
    !checkObject(shader)) {
    throw new TypeError('detachShader(WebGLProgram, WebGLShader)')
  }
  if (checkWrapper(this, program, WebGLProgram) &&
    checkWrapper(this, shader, WebGLShader)) {
    if (linked(program, shader)) {
      _detachShader.call(this, program._, shader._)
      unlink(program, shader)
    } else {
      setError(this, gl.INVALID_OPERATION)
    }
  }
}

var _disable = gl.disable
gl.disable = function disable (cap) {
  cap |= 0
  _disable.call(this, cap)
  if (cap === gl.TEXTURE_2D ||
    cap === gl.TEXTURE_CUBE_MAP) {
    var active = activeTextureUnit(this)
    if (active._mode === cap) {
      active._mode = 0
    }
  }
}

var _disableVertexAttribArray = gl.disableVertexAttribArray
gl.disableVertexAttribArray = function disableVertexAttribArray (index) {
  index |= 0
  if (index < 0 || index >= this._vertexAttribs.length) {
    setError(this, gl.INVALID_VALUE)
    return
  }
  _disableVertexAttribArray.call(this, index)
  this._vertexAttribs[index]._isPointer = false
}

var _vertexAttribDivisor = gl.vertexAttribDivisor
delete gl.vertexAttribDivisor

function beginAttrib0Hack (context) {
  _bindBuffer.call(context, gl.ARRAY_BUFFER, context._attrib0Buffer._)
  _bufferData.call(
    context,
    gl.ARRAY_BUFFER,
    context._vertexAttribs[0]._data,
    gl.STREAM_DRAW)
  _enableVertexAttribArray.call(context, 0)
  _vertexAttribPointer.call(context, 0, 4, gl.FLOAT, false, 0, 0)
  _vertexAttribDivisor.call(context, 0, 1)
}

function endAttrib0Hack (context) {
  var attrib = context._vertexAttribs[0]
  if (attrib._pointerBuffer) {
    _bindBuffer.call(context, gl.ARRAY_BUFFER, attrib._pointerBuffer._)
  } else {
    _bindBuffer.call(context, gl.ARRAY_BUFFER, 0)
  }
  _vertexAttribPointer.call(context,
    0,
    attrib._inputSize,
    attrib._pointerType,
    attrib._pointerNormal,
    attrib._inputStride,
    attrib._pointerOffset)
  _vertexAttribDivisor.call(context, 0, 0)
  _disableVertexAttribArray.call(context, 0)
  if (context._activeArrayBuffer) {
    _bindBuffer.call(context, gl.ARRAY_BUFFER, context._activeArrayBuffer._)
  } else {
    _bindBuffer.call(context, gl.ARRAY_BUFFER, 0)
  }
}

function checkStencilState (context) {
  if (context.getParameter(gl.STENCIL_WRITEMASK) !==
    context.getParameter(gl.STENCIL_BACK_WRITEMASK) ||
    context.getParameter(gl.STENCIL_VALUE_MASK) !==
    context.getParameter(gl.STENCIL_BACK_VALUE_MASK) ||
    context.getParameter(gl.STENCIL_REF) !==
    context.getParameter(gl.STENCIL_BACK_REF)) {
    setError(context, gl.INVALID_OPERATION)
    return false
  }
  return true
}

var _drawArrays = gl.drawArrays
var _drawArraysInstanced = gl.drawArraysInstanced
delete gl.drawArraysInstanced
gl.drawArrays = function drawArrays (mode, first, count) {
  mode |= 0
  first |= 0
  count |= 0

  if (first < 0 || count < 0) {
    setError(this, gl.INVALID_VALUE)
    return
  }

  if (!checkStencilState(this)) {
    return
  }

  var reducedCount = vertexCount(mode, count)
  if (reducedCount < 0) {
    setError(this, gl.INVALID_ENUM)
    return
  }

  if (!framebufferOk(this)) {
    return
  }

  if (count === 0) {
    return
  }

  var maxIndex = first
  if (count > 0) {
    maxIndex = (count + first - 1) >>> 0
  }
  if (checkVertexAttribState(this, maxIndex)) {
    if (this._vertexAttribs[0]._isPointer) {
      return _drawArrays.call(this, mode, first, reducedCount)
    } else {
      beginAttrib0Hack(this)
      _drawArraysInstanced.call(this, mode, first, reducedCount, 1)
      endAttrib0Hack(this)
    }
  }
}

var _drawElements = gl.drawElements
var _drawElementsInstanced = gl.drawElementsInstanced
delete gl.drawElementsInstanced
gl.drawElements = function drawElements (mode, count, type, ioffset) {
  mode |= 0
  count |= 0
  type |= 0
  ioffset |= 0

  if (count < 0 || ioffset < 0) {
    setError(this, gl.INVALID_VALUE)
    return
  }

  if (!checkStencilState(this)) {
    return
  }

  var elementBuffer = this._activeElementArrayBuffer
  if (!elementBuffer) {
    setError(this, gl.INVALID_OPERATION)
    return
  }

  // Unpack element data
  var elementData = null
  var offset = ioffset
  if (type === gl.UNSIGNED_SHORT) {
    if (offset % 2) {
      setError(this, gl.INVALID_OPERATION)
      return
    }
    offset >>= 1
    elementData = new Uint16Array(elementBuffer._elements.buffer)
  } else if (type === gl.UNSIGNED_BYTE) {
    elementData = elementBuffer._elements
  } else {
    setError(this, gl.INVALID_ENUM)
    return
  }

  var reducedCount = count
  switch (mode) {
    case gl.TRIANGLES:
      if (count % 3) {
        reducedCount -= (count % 3)
      }
      break
    case gl.LINES:
      if (count % 2) {
        reducedCount -= (count % 2)
      }
      break
    case gl.POINTS:
      break
    case gl.LINE_LOOP:
    case gl.LINE_STRIP:
      if (count < 2) {
        setError(this, gl.INVALID_OPERATION)
        return
      }
      break
    case gl.TRIANGLE_FAN:
    case gl.TRIANGLE_STRIP:
      if (count < 3) {
        setError(this, gl.INVALID_OPERATION)
        return
      }
      break
    default:
      setError(this, gl.INVALID_ENUM)
      return
  }

  if (!framebufferOk(this)) {
    return
  }

  if (count === 0) {
    checkVertexAttribState(this, 0)
    return
  }

  if ((count + offset) >>> 0 > elementData.length) {
    setError(this, gl.INVALID_OPERATION)
    return
  }

  // Compute max index
  var maxIndex = -1
  for (var i = offset; i < offset + count; ++i) {
    maxIndex = Math.max(maxIndex, elementData[i])
  }

  if (maxIndex < 0) {
    checkVertexAttribState(this, 0)
    return
  }

  if (checkVertexAttribState(this, maxIndex)) {
    if (reducedCount > 0) {
      if (this._vertexAttribs[0]._isPointer) {
        return _drawElements.call(this, mode, reducedCount, type, ioffset)
      } else {
        beginAttrib0Hack(this)
        _drawElementsInstanced.call(this, mode, reducedCount, type, ioffset, 1)
        endAttrib0Hack(this)
      }
    }
  }
}

var _enable = gl.enable
gl.enable = function enable (cap) {
  cap |= 0
  _enable.call(this, cap)
}

var _enableVertexAttribArray = gl.enableVertexAttribArray
gl.enableVertexAttribArray = function enableVertexAttribArray (index) {
  index |= 0
  if (index < 0 || index >= this._vertexAttribs.length) {
    setError(this, gl.INVALID_VALUE)
    return
  }

  _enableVertexAttribArray.call(this, index)

  this._vertexAttribs[index]._isPointer = true
}

var _finish = gl.finish
gl.finish = function finish () {
  return _finish.call(this)
}

var _flush = gl.flush
gl.flush = function flush () {
  return _flush.call(this)
}

function updateFramebufferAttachments (framebuffer) {
  var prevStatus = framebuffer._status
  var ctx = framebuffer._ctx
  var i
  framebuffer._status = precheckFramebufferStatus(framebuffer)
  if (framebuffer._status !== gl.FRAMEBUFFER_COMPLETE) {
    if (prevStatus === gl.FRAMEBUFFER_COMPLETE) {
      for (i = 0; i < ATTACHMENTS.length; ++i) {
        _framebufferTexture2D.call(
          ctx,
          gl.FRAMEBUFFER,
          ATTACHMENTS[i],
          gl.TEXTURE_2D,
          0,
          0)
      }
    }
    return
  }

  for (i = 0; i < ATTACHMENTS.length; ++i) {
    _framebufferTexture2D.call(
      ctx,
      gl.FRAMEBUFFER,
      ATTACHMENTS[i],
      gl.TEXTURE_2D,
      0,
      0)
  }

  for (i = 0; i < ATTACHMENTS.length; ++i) {
    var attachmentEnum = ATTACHMENTS[i]
    var attachment = framebuffer._attachments[attachmentEnum]
    if (attachment instanceof WebGLTexture) {
      _framebufferTexture2D.call(
        ctx,
        gl.FRAMEBUFFER,
        attachmentEnum,
        gl.TEXTURE_2D,
        attachment._ | 0,
        framebuffer._attachmentLevel[attachmentEnum])
    } else if (attachment instanceof WebGLRenderbuffer) {
      _framebufferRenderbuffer.call(
        ctx,
        gl.FRAMEBUFFER,
        attachmentEnum,
        gl.RENDERBUFFER,
        attachment._ | 0)
    }
  }
}

var _framebufferRenderbuffer = gl.framebufferRenderbuffer
gl.framebufferRenderbuffer = function framebufferRenderbuffer (
  target,
  attachment,
  renderbuffertarget,
  renderbuffer) {
  target = target | 0
  attachment = attachment | 0
  renderbuffertarget = renderbuffertarget | 0

  if (!checkObject(renderbuffer)) {
    throw new TypeError('framebufferRenderbuffer(GLenum, GLenum, GLenum, WebGLRenderbuffer)')
  }

  if (target !== gl.FRAMEBUFFER ||
    !validFramebufferAttachment(attachment) ||
    renderbuffertarget !== gl.RENDERBUFFER) {
    setError(this, gl.INVALID_ENUM)
    return
  }

  var framebuffer = this._activeFramebuffer
  if (!framebuffer) {
    setError(this, gl.INVALID_OPERATION)
    return
  }

  if (renderbuffer && !checkWrapper(this, renderbuffer, WebGLRenderbuffer)) {
    return
  }

  setFramebufferAttachment(framebuffer, renderbuffer, attachment)
  updateFramebufferAttachments(framebuffer)
}

var _framebufferTexture2D = gl.framebufferTexture2D
gl.framebufferTexture2D = function framebufferTexture2D (
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

  // Check parameters are ok
  if (target !== gl.FRAMEBUFFER ||
    !validFramebufferAttachment(attachment)) {
    setError(this, gl.INVALID_ENUM)
    return
  }

  if (level !== 0) {
    setError(this, gl.INVALID_VALUE)
    return
  }

  // Check object ownership
  if (texture && !checkWrapper(this, texture, WebGLTexture)) {
    return
  }

  // Check texture target is ok
  if (textarget === gl.TEXTURE_2D) {
    if (texture && texture._binding !== gl.TEXTURE_2D) {
      setError(this, gl.INVALID_OPERATION)
      return
    }
  } else if (validCubeTarget(textarget)) {
    if (texture && texture._binding !== gl.TEXTURE_CUBE_MAP) {
      setError(this, gl.INVALID_OPERATION)
      return
    }
  } else {
    setError(this, gl.INVALID_ENUM)
    return
  }

  // Check a framebuffer is actually bound
  var framebuffer = this._activeFramebuffer
  if (!framebuffer) {
    setError(this, gl.INVALID_OPERATION)
    return
  }

  framebuffer._attachmentLevel[attachment] = level
  framebuffer._attachmentFace[attachment] = textarget
  setFramebufferAttachment(framebuffer, texture, attachment)
  updateFramebufferAttachments(framebuffer)
}

var _frontFace = gl.frontFace
gl.frontFace = function frontFace (mode) {
  return _frontFace.call(this, mode | 0)
}

var _generateMipmap = gl.generateMipmap
gl.generateMipmap = function generateMipmap (target) {
  return _generateMipmap.call(this, target | 0) | 0
}

var _getActiveAttrib = gl.getActiveAttrib
gl.getActiveAttrib = function getActiveAttrib (program, index) {
  if (!checkObject(program)) {
    throw new TypeError('getActiveAttrib(WebGLProgram)')
  } else if (!program) {
    setError(this, gl.INVALID_VALUE)
  } else if (checkWrapper(this, program, WebGLProgram)) {
    var info = _getActiveAttrib.call(this, program._ | 0, index | 0)
    if (info) {
      return new WebGLActiveInfo(info)
    }
  }
  return null
}

var _getActiveUniform = gl.getActiveUniform
gl.getActiveUniform = function getActiveUniform (program, index) {
  if (!checkObject(program)) {
    throw new TypeError('getActiveUniform(WebGLProgram, GLint)')
  } else if (!program) {
    setError(this, gl.INVALID_VALUE)
  } else if (checkWrapper(this, program, WebGLProgram)) {
    var info = _getActiveUniform.call(this, program._ | 0, index | 0)
    if (info) {
      return new WebGLActiveInfo(info)
    }
  }
  return null
}

var _getAttachedShaders = gl.getAttachedShaders
gl.getAttachedShaders = function getAttachedShaders (program) {
  if (!checkObject(program) ||
    (typeof program === 'object' &&
    program !== null &&
    !(program instanceof WebGLProgram))) {
    throw new TypeError('getAttachedShaders(WebGLProgram)')
  }
  if (!program) {
    setError(this, gl.INVALID_VALUE)
  } else if (checkWrapper(this, program, WebGLProgram)) {
    var shaderArray = _getAttachedShaders.call(this, program._ | 0)
    if (!shaderArray) {
      return null
    }
    var unboxedShaders = new Array(shaderArray.length)
    for (var i = 0; i < shaderArray.length; ++i) {
      unboxedShaders[i] = this._shaders[shaderArray[i]]
    }
    return unboxedShaders
  }
  return null
}

var _getAttribLocation = gl.getAttribLocation
gl.getAttribLocation = function getAttribLocation (program, name) {
  if (!checkObject(program)) {
    throw new TypeError('getAttribLocation(WebGLProgram, String)')
  }
  name += ''
  if (!isValidString(name) || name.length > MAX_ATTRIBUTE_LENGTH) {
    setError(this, gl.INVALID_VALUE)
  } else if (checkWrapper(this, program, WebGLProgram)) {
    return _getAttribLocation.call(this, program._ | 0, name + '')
  }
  return -1
}

var _getParameter = gl.getParameter
gl.getParameter = function getParameter (pname) {
  pname |= 0
  switch (pname) {
    case gl.ARRAY_BUFFER_BINDING:
      return this._activeArrayBuffer
    case gl.ELEMENT_ARRAY_BUFFER_BINDING:
      return this._activeElementArrayBuffer
    case gl.CURRENT_PROGRAM:
      return this._activeProgram
    case gl.FRAMEBUFFER_BINDING:
      return this._activeFramebuffer
    case gl.RENDERBUFFER_BINDING:
      return this._activeRenderbuffer
    case gl.TEXTURE_BINDING_2D:
      return activeTextureUnit(this)._bind2D
    case gl.TEXTURE_BINDING_CUBE_MAP:
      return activeTextureUnit(this)._bindCube
    case gl.VERSION:
      return 'WebGL 1.0 stack-gl ' + HEADLESS_VERSION
    case gl.VENDOR:
      return 'stack-gl'
    case gl.RENDERER:
      return 'ANGLE'
    case gl.SHADING_LANGUAGE_VERSION:
      return 'WebGL GLSL ES 1.0 stack-gl'

    case gl.COMPRESSED_TEXTURE_FORMATS:
      return new Uint32Array(0)

    // Int arrays
    case gl.MAX_VIEWPORT_DIMS:
    case gl.SCISSOR_BOX:
    case gl.VIEWPORT:
      return new Int32Array(_getParameter.call(this, pname))

    // Float arrays
    case gl.ALIASED_LINE_WIDTH_RANGE:
    case gl.ALIASED_POINT_SIZE_RANGE:
    case gl.DEPTH_RANGE:
    case gl.BLEND_COLOR:
    case gl.COLOR_CLEAR_VALUE:
      return new Float32Array(_getParameter.call(this, pname))

    case gl.COLOR_WRITEMASK:
      return _getParameter.call(this, pname)

    case gl.DEPTH_CLEAR_VALUE:
    case gl.LINE_WIDTH:
    case gl.POLYGON_OFFSET_FACTOR:
    case gl.POLYGON_OFFSET_UNITS:
    case gl.SAMPLE_COVERAGE_VALUE:
      return +_getParameter.call(this, pname)

    case gl.BLEND:
    case gl.CULL_FACE:
    case gl.DEPTH_TEST:
    case gl.DEPTH_WRITEMASK:
    case gl.DITHER:
    case gl.POLYGON_OFFSET_FILL:
    case gl.SAMPLE_COVERAGE_INVERT:
    case gl.SCISSOR_TEST:
    case gl.STENCIL_TEST:
    case gl.UNPACK_FLIP_Y_WEBGL:
    case gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL:
      return !!_getParameter.call(this, pname)

    case gl.ACTIVE_TEXTURE:
    case gl.ALPHA_BITS:
    case gl.BLEND_DST_ALPHA:
    case gl.BLEND_DST_RGB:
    case gl.BLEND_EQUATION_ALPHA:
    case gl.BLEND_EQUATION_RGB:
    case gl.BLEND_SRC_ALPHA:
    case gl.BLEND_SRC_RGB:
    case gl.BLUE_BITS:
    case gl.CULL_FACE_MODE:
    case gl.DEPTH_BITS:
    case gl.DEPTH_FUNC:
    case gl.FRONT_FACE:
    case gl.GENERATE_MIPMAP_HINT:
    case gl.GREEN_BITS:
    case gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS:
    case gl.MAX_CUBE_MAP_TEXTURE_SIZE:
    case gl.MAX_FRAGMENT_UNIFORM_VECTORS:
    case gl.MAX_RENDERBUFFER_SIZE:
    case gl.MAX_TEXTURE_IMAGE_UNITS:
    case gl.MAX_TEXTURE_SIZE:
    case gl.MAX_VARYING_VECTORS:
    case gl.MAX_VERTEX_ATTRIBS:
    case gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS:
    case gl.MAX_VERTEX_UNIFORM_VECTORS:
    case gl.PACK_ALIGNMENT:
    case gl.RED_BITS:
    case gl.SAMPLE_BUFFERS:
    case gl.SAMPLES:
    case gl.STENCIL_BACK_FAIL:
    case gl.STENCIL_BACK_FUNC:
    case gl.STENCIL_BACK_PASS_DEPTH_FAIL:
    case gl.STENCIL_BACK_PASS_DEPTH_PASS:
    case gl.STENCIL_BACK_REF:
    case gl.STENCIL_BACK_VALUE_MASK:
    case gl.STENCIL_BACK_WRITEMASK:
    case gl.STENCIL_BITS:
    case gl.STENCIL_CLEAR_VALUE:
    case gl.STENCIL_FAIL:
    case gl.STENCIL_FUNC:
    case gl.STENCIL_PASS_DEPTH_FAIL:
    case gl.STENCIL_PASS_DEPTH_PASS:
    case gl.STENCIL_REF:
    case gl.STENCIL_VALUE_MASK:
    case gl.STENCIL_WRITEMASK:
    case gl.SUBPIXEL_BITS:
    case gl.UNPACK_ALIGNMENT:
    case gl.UNPACK_COLORSPACE_CONVERSION_WEBGL:
      return _getParameter.call(this, pname) | 0

    default:
      setError(this, gl.INVALID_ENUM)
      return null
  }
}

var _getShaderPrecisionFormat = gl.getShaderPrecisionFormat
gl.getShaderPrecisionFormat = function getShaderPrecisionFormat (
  shaderType,
  precisionType) {
  shaderType |= 0
  precisionType |= 0

  if (!(shaderType === gl.FRAGMENT_SHADER ||
    shaderType === gl.VERTEX_SHADER) ||
    !(precisionType === gl.LOW_FLOAT ||
    precisionType === gl.MEDIUM_FLOAT ||
    precisionType === gl.HIGH_FLOAT ||
    precisionType === gl.LOW_INT ||
    precisionType === gl.MEDIUM_INT ||
    precisionType === gl.HIGH_INT)) {
    setError(this, gl.INVALID_ENUM)
    return
  }

  var format = _getShaderPrecisionFormat.call(this, shaderType, precisionType)
  if (!format) {
    return null
  }

  return new WebGLShaderPrecisionFormat(format)
}

var _getBufferParameter = gl.getBufferParameter
gl.getBufferParameter = function getBufferParameter (target, pname) {
  target |= 0
  pname |= 0
  if (target !== gl.ARRAY_BUFFER &&
    target !== gl.ELEMENT_ARRAY_BUFFER) {
    setError(this, gl.INVALID_ENUM)
    return null
  }

  switch (pname) {
    case gl.BUFFER_SIZE:
    case gl.BUFFER_USAGE:
      return _getBufferParameter.call(this, target | 0, pname | 0)
    default:
      setError(this, gl.INVALID_ENUM)
      return null
  }
}

var _getError = gl.getError
gl.getError = function getError () {
  return _getError.call(this)
}

gl.getFramebufferAttachmentParameter = function getFramebufferAttachmentParameter (target, attachment, pname) {
  target |= 0
  attachment |= 0
  pname |= 0

  if (target !== gl.FRAMEBUFFER ||
    !validFramebufferAttachment(attachment)) {
    setError(this, gl.INVALID_ENUM)
    return null
  }

  var framebuffer = this._activeFramebuffer
  if (!framebuffer) {
    setError(this, gl.INVALID_OPERATION)
    return null
  }

  var object = framebuffer._attachments[attachment]
  if (object === null) {
    switch (pname) {
      case gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE:
        return gl.NONE
    }
  } else if (object instanceof WebGLTexture) {
    switch (pname) {
      case gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME:
        return object
      case gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE:
        return gl.TEXTURE
      case gl.FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL:
        return framebuffer._attachmentLevel[attachment]
      case gl.FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE:
        var face = framebuffer._attachmentFace[attachment]
        if (face === gl.TEXTURE_2D) {
          return 0
        }
        return face
    }
  } else if (object instanceof WebGLRenderbuffer) {
    switch (pname) {
      case gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME:
        return object
      case gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE:
        return gl.RENDERBUFFER
    }
  }

  setError(this, gl.INVALID_ENUM)
  return null
}

var _getProgramParameter = gl.getProgramParameter
gl.getProgramParameter = function getProgramParameter (program, pname) {
  pname |= 0
  if (!checkObject(program)) {
    throw new TypeError('getProgramParameter(WebGLProgram, GLenum)')
  } else if (checkWrapper(this, program, WebGLProgram)) {
    switch (pname) {
      case gl.DELETE_STATUS:
        return program._pendingDelete

      case gl.LINK_STATUS:
        return program._linkStatus

      case gl.VALIDATE_STATUS:
        return !!_getProgramParameter.call(this, program._, pname)

      case gl.ATTACHED_SHADERS:
      case gl.ACTIVE_ATTRIBUTES:
      case gl.ACTIVE_UNIFORMS:
        return _getProgramParameter.call(this, program._, pname)
    }
    setError(this, gl.INVALID_ENUM)
  }
  return null
}

var _getProgramInfoLog = gl.getProgramInfoLog
gl.getProgramInfoLog = function getProgramInfoLog (program) {
  if (!checkObject(program)) {
    throw new TypeError('getProgramInfoLog(WebGLProgram)')
  } else if (checkWrapper(this, program, WebGLProgram)) {
    return program._linkInfoLog
  }
  return null
}

var _getRenderbufferParameter = gl.getRenderbufferParameter
gl.getRenderbufferParameter = function getRenderbufferParameter (target, pname) {
  target |= 0
  pname |= 0
  if (target !== gl.RENDERBUFFER) {
    setError(this, gl.INVALID_ENUM)
    return null
  }
  var renderbuffer = this._activeRenderbuffer
  if (!renderbuffer) {
    setError(this, gl.INVALID_OPERATION)
    return null
  }
  switch (pname) {
    case gl.RENDERBUFFER_INTERNAL_FORMAT:
      return renderbuffer._format
    case gl.RENDERBUFFER_WIDTH:
      return renderbuffer._width
    case gl.RENDERBUFFER_HEIGHT:
      return renderbuffer._height
    case gl.RENDERBUFFER_SIZE:
    case gl.RENDERBUFFER_RED_SIZE:
    case gl.RENDERBUFFER_GREEN_SIZE:
    case gl.RENDERBUFFER_BLUE_SIZE:
    case gl.RENDERBUFFER_ALPHA_SIZE:
    case gl.RENDERBUFFER_DEPTH_SIZE:
    case gl.RENDERBUFFER_STENCIL_SIZE:
      return _getRenderbufferParameter.call(this, target, pname)
  }
  setError(this, gl.INVALID_ENUM)
  return null
}

var _getShaderParameter = gl.getShaderParameter
gl.getShaderParameter = function getShaderParameter (shader, pname) {
  pname |= 0
  if (!checkObject(shader)) {
    throw new TypeError('getShaderParameter(WebGLShader, GLenum)')
  } else if (checkWrapper(this, shader, WebGLShader)) {
    switch (pname) {
      case gl.DELETE_STATUS:
        return shader._pendingDelete
      case gl.COMPILE_STATUS:
        return shader._compileStatus
      case gl.SHADER_TYPE:
        return shader._type
    }
    setError(this, gl.INVALID_ENUM)
  }
  return null
}

var _getShaderInfoLog = gl.getShaderInfoLog
gl.getShaderInfoLog = function getShaderInfoLog (shader) {
  if (!checkObject(shader)) {
    throw new TypeError('getShaderInfoLog(WebGLShader)')
  } else if (checkWrapper(this, shader, WebGLShader)) {
    return shader._compileInfo
  }
  return null
}

gl.getShaderSource = function getShaderSource (shader) {
  if (!checkObject(shader)) {
    throw new TypeError('Input to getShaderSource must be an object')
  } else if (checkWrapper(this, shader, WebGLShader)) {
    return shader._source
  }
  return null
}

var _getTexParameter = gl.getTexParameter
gl.getTexParameter = function getTexParameter (target, pname) {
  target |= 0
  pname |= 0

  if (!checkTextureTarget(this, target)) {
    return null
  }

  var unit = activeTextureUnit(this)
  if ((target === gl.TEXTURE_2D && !unit._bind2D) ||
    (target === gl.TEXTURE_CUBE_MAP && !unit._bindCube)) {
    setError(this, gl.INVALID_OPERATION)
    return null
  }

  switch (pname) {
    case gl.TEXTURE_MAG_FILTER:
    case gl.TEXTURE_MIN_FILTER:
    case gl.TEXTURE_WRAP_S:
    case gl.TEXTURE_WRAP_T:
      return _getTexParameter.call(this, target, pname)
  }

  setError(this, gl.INVALID_ENUM)
  return null
}

var _getUniform = gl.getUniform
gl.getUniform = function getUniform (program, location) {
  if (!checkObject(program) ||
    !checkObject(location)) {
    throw new TypeError('getUniform(WebGLProgram, WebGLUniformLocation)')
  } else if (!program) {
    setError(this, gl.INVALID_VALUE)
    return null
  } else if (!location) {
    return null
  } else if (checkWrapper(this, program, WebGLProgram)) {
    if (!checkUniform(program, location)) {
      setError(this, gl.INVALID_OPERATION)
      return null
    }
    var data = _getUniform.call(this, program._ | 0, location._ | 0)
    if (!data) {
      return null
    }
    switch (location._activeInfo.type) {
      case gl.FLOAT:
        return data[0]
      case gl.FLOAT_VEC2:
        return new Float32Array(data.slice(0, 2))
      case gl.FLOAT_VEC3:
        return new Float32Array(data.slice(0, 3))
      case gl.FLOAT_VEC4:
        return new Float32Array(data.slice(0, 4))
      case gl.INT:
        return data[0] | 0
      case gl.INT_VEC2:
        return new Int32Array(data.slice(0, 2))
      case gl.INT_VEC3:
        return new Int32Array(data.slice(0, 3))
      case gl.INT_VEC4:
        return new Int32Array(data.slice(0, 4))
      case gl.BOOL:
        return !!data[0]
      case gl.BOOL_VEC2:
        return [!!data[0], !!data[1]]
      case gl.BOOL_VEC3:
        return [!!data[0], !!data[1], !!data[2]]
      case gl.BOOL_VEC4:
        return [!!data[0], !!data[1], !!data[2], !!data[3]]
      case gl.FLOAT_MAT2:
        return new Float32Array(data.slice(0, 4))
      case gl.FLOAT_MAT3:
        return new Float32Array(data.slice(0, 9))
      case gl.FLOAT_MAT4:
        return new Float32Array(data.slice(0, 16))
      case gl.SAMPLER_2D:
      case gl.SAMPLER_CUBE:
        return data[0] | 0
      default:
        return null
    }
  }
  return null
}

var _getUniformLocation = gl.getUniformLocation
gl.getUniformLocation = function getUniformLocation (program, name) {
  if (!checkObject(program)) {
    throw new TypeError('getUniformLocation(WebGLProgram, String)')
  }

  name += ''
  if (!isValidString(name)) {
    setError(this, gl.INVALID_VALUE)
    return
  }

  if (checkWrapper(this, program, WebGLProgram)) {
    var loc = _getUniformLocation.call(this, program._ | 0, name)
    if (loc >= 0) {
      var searchName = name
      if (/\[\d+\]$/.test(name)) {
        searchName = name.replace(/\[\d+\]$/, '[0]')
      }

      var info = null
      for (var i = 0; i < program._uniforms.length; ++i) {
        var infoItem = program._uniforms[i]
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

      var result = new WebGLUniformLocation(
        loc,
        program,
        info)

      // handle array case
      if (/\[0\]$/.test(name)) {
        var baseName = name.replace(/\[0\]$/, '')
        var arrayLocs = []

        if (offset < 0 || offset >= info.size) {
          return null
        }

        saveError(this)
        for (i = 0; this.getError() === gl.NO_ERROR; ++i) {
          var xloc = _getUniformLocation.call(
            this,
            program._ | 0,
            baseName + '[' + i + ']')
          if (this.getError() !== gl.NO_ERROR || xloc < 0) {
            break
          }
          arrayLocs.push(xloc)
        }
        restoreError(this, gl.NO_ERROR)

        result._array = arrayLocs
      } else if (/\[(\d+)\]$/.test(name)) {
        var offset = +(/\[(\d+)\]$/.exec(name))[1]
        if (offset < 0 || offset >= info.size) {
          return null
        }
      }
      return result
    }
  }
  return null
}

gl.getVertexAttrib = function getVertexAttrib (index, pname) {
  index |= 0
  pname |= 0
  if (index < 0 || index >= this._vertexAttribs.length) {
    setError(this, gl.INVALID_VALUE)
    return null
  }
  var attrib = this._vertexAttribs[index]
  switch (pname) {
    case gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING:
      return attrib._pointerBuffer
    case gl.VERTEX_ATTRIB_ARRAY_ENABLED:
      return attrib._isPointer
    case gl.VERTEX_ATTRIB_ARRAY_SIZE:
      return attrib._inputSize
    case gl.VERTEX_ATTRIB_ARRAY_STRIDE:
      return attrib._inputStride
    case gl.VERTEX_ATTRIB_ARRAY_TYPE:
      return attrib._pointerType
    case gl.VERTEX_ATTRIB_ARRAY_NORMALIZED:
      return attrib._pointerNormal
    case gl.CURRENT_VERTEX_ATTRIB:
      return new Float32Array(attrib._data)
    default:
      setError(this, gl.INVALID_ENUM)
      return null
  }
}

gl.getVertexAttribOffset = function getVertexAttribOffset (index, pname) {
  index |= 0
  pname |= 0
  if (index < 0 || index >= this._vertexAttribs.length) {
    setError(this, gl.INVALID_VALUE)
    return null
  }
  if (pname === gl.VERTEX_ATTRIB_ARRAY_POINTER) {
    return this._vertexAttribs[index]._pointerOffset
  } else {
    setError(this, gl.INVALID_ENUM)
    return null
  }
}

var _hint = gl.hint
gl.hint = function hint (target, mode) {
  target |= 0
  mode |= 0

  if (target !== gl.GENERATE_MIPMAP_HINT) {
    setError(this, gl.INVALID_ENUM)
    return
  }

  if (mode !== gl.FASTEST &&
    mode !== gl.NICEST &&
    mode !== gl.DONT_CARE) {
    setError(this, gl.INVALID_ENUM)
    return
  }

  return _hint.call(this, target, mode)
}

function isObject (method, wrapper) {
  var native = gl[method]
  gl[method] = function (object) {
    if (!(object === null || object === void 0) &&
      !(object instanceof wrapper)) {
      throw new TypeError(method + '(' + wrapper.name + ')')
    }
    if (checkValid(object, wrapper) &&
      checkOwns(this, object)) {
      return native.call(this, object._ | 0)
    }
    return false
  }
}

isObject('isBuffer', WebGLBuffer)
isObject('isFramebuffer', WebGLFramebuffer)
isObject('isProgram', WebGLProgram)
isObject('isRenderbuffer', WebGLRenderbuffer)
isObject('isShader', WebGLShader)
isObject('isTexture', WebGLTexture)

var _isEnabled = gl.isEnabled
gl.isEnabled = function isEnabled (cap) {
  return _isEnabled.call(this, cap | 0)
}

var _lineWidth = gl.lineWidth
gl.lineWidth = function lineWidth (width) {
  if (isNaN(width)) {
    setError(this, gl.INVALID_VALUE)
    return
  }
  return _lineWidth.call(this, +width)
}

var _linkProgram = gl.linkProgram

function fixupLink (context, program) {
  if (!_getProgramParameter.call(context, program._, gl.LINK_STATUS)) {
    program._linkInfoLog = _getProgramInfoLog.call(context, program)
    return false
  }

  // Record attribute locations
  var numAttribs = context.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES)
  var names = new Array(numAttribs)
  program._attributes.length = numAttribs
  for (var i = 0; i < numAttribs; ++i) {
    names[i] = context.getActiveAttrib(program, i).name
    program._attributes[i] = context.getAttribLocation(program, names[i]) | 0
  }

  // Check attribute names
  for (i = 0; i < names.length; ++i) {
    if (names[i].length > MAX_ATTRIBUTE_LENGTH) {
      program._linkInfoLog = 'attribute ' + names[i] + ' is too long'
      return false
    }
  }

  for (i = 0; i < numAttribs; ++i) {
    _bindAttribLocation.call(
      context,
      program._ | 0,
      program._attributes[i],
      names[i])
  }

  _linkProgram.call(context, program._ | 0)

  var numUniforms = context.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
  program._uniforms.length = numUniforms
  for (i = 0; i < numUniforms; ++i) {
    program._uniforms[i] = context.getActiveUniform(program, i)
  }

  // Check attribute and uniform name lengths
  for (i = 0; i < program._uniforms.length; ++i) {
    if (program._uniforms[i].name.length > MAX_UNIFORM_LENGTH) {
      program._linkInfoLog = 'uniform ' + program._uniforms[i].name + ' is too long'
      return false
    }
  }

  program._linkInfoLog = ''
  return true
}

gl.linkProgram = function linkProgram (program) {
  if (!checkObject(program)) {
    throw new TypeError('linkProgram(WebGLProgram)')
  }
  if (checkWrapper(this, program, WebGLProgram)) {
    program._linkCount += 1
    program._attributes = []
    var prevError = this.getError()
    _linkProgram.call(this, program._ | 0)
    var error = this.getError()
    if (error === gl.NO_ERROR) {
      program._linkStatus = fixupLink(this, program)
    }
    this.getError()
    setError(this, prevError || error)
  }
}

var _pixelStorei = gl.pixelStorei
gl.pixelStorei = function pixelStorei (pname, param) {
  pname |= 0
  param |= 0
  if (pname === gl.UNPACK_ALIGNMENT) {
    if (param === 1 ||
      param === 2 ||
      param === 4 ||
      param === 8) {
      this._unpackAlignment = param
    } else {
      setError(this, gl.INVALID_VALUE)
      return
    }
  } else if (pname === gl.PACK_ALIGNMENT) {
    if (param === 1 ||
      param === 2 ||
      param === 4 ||
      param === 8) {
      this._packAlignment = param
    } else {
      setError(this, gl.INVALID_VALUE)
      return
    }
  } else if (pname === gl.UNPACK_COLORSPACE_CONVERSION_WEBGL) {
    if (!(param === gl.NONE || param === gl.BROWSER_DEFAULT_WEBGL)) {
      setError(this, gl.INVALID_VALUE)
      return
    }
  }
  return _pixelStorei.call(this, pname, param)
}

var _polygonOffset = gl.polygonOffset
gl.polygonOffset = function polygonOffset (factor, units) {
  return _polygonOffset.call(this, +factor, +units)
}

var _readPixels = gl.readPixels
gl.readPixels = function readPixels (x, y, width, height, format, type, pixels) {
  var i
  var j
  var k

  x |= 0
  y |= 0
  width |= 0
  height |= 0

  if (format === gl.RGB ||
    format === gl.ALPHA ||
    type !== gl.UNSIGNED_BYTE) {
    setError(this, gl.INVALID_OPERATION)
    return
  } else if (format !== gl.RGBA) {
    setError(this, gl.INVALID_ENUM)
    return
  } else if (
    width < 0 ||
    height < 0 ||
    !(pixels instanceof Uint8Array)) {
    setError(this, gl.INVALID_VALUE)
    return
  }

  if (!framebufferOk(this)) {
    return
  }

  var rowStride = width * 4
  if (rowStride % this._packAlignment !== 0) {
    rowStride += this._packAlignment - (rowStride % this._packAlignment)
  }

  var imageSize = rowStride * (height - 1) + width * 4
  if (imageSize <= 0) {
    return
  }
  if (pixels.length < imageSize) {
    setError(this, gl.INVALID_VALUE)
    return
  }

  // Handle reading outside the window
  var viewWidth = this.drawingBufferWidth
  var viewHeight = this.drawingBufferHeight

  if (this._activeFramebuffer) {
    viewWidth = this._activeFramebuffer._width
    viewHeight = this._activeFramebuffer._height
  }

  var pixelData = unpackTypedArray(pixels)

  if (x >= viewWidth || x + width <= 0 ||
    y >= viewHeight || y + height <= 0) {
    for (i = 0; i < pixelData.length; ++i) {
      pixelData[i] = 0
    }
  } else if (x < 0 || x + width > viewWidth ||
    y < 0 || y + height > viewHeight) {
    for (i = 0; i < pixelData.length; ++i) {
      pixelData[i] = 0
    }

    var nx = x
    var nwidth = width
    if (x < 0) {
      nwidth += x
      nx = 0
    }
    if (nx + width > viewWidth) {
      nwidth = viewWidth - nx
    }
    var ny = y
    var nheight = height
    if (y < 0) {
      nheight += y
      ny = 0
    }
    if (ny + height > viewHeight) {
      nheight = viewHeight - ny
    }

    var nRowStride = nwidth * 4
    if (nRowStride % this._packAlignment !== 0) {
      nRowStride += this._packAlignment - (nRowStride % this._packAlignment)
    }

    if (nwidth > 0 && nheight > 0) {
      var subPixels = new Uint8Array(nRowStride * nheight)
      _readPixels.call(
        this,
        nx,
        ny,
        nwidth,
        nheight,
        format,
        type,
        subPixels)

      var offset = 4 * (nx - x) + (ny - y) * rowStride
      for (j = 0; j < nheight; ++j) {
        for (i = 0; i < nwidth; ++i) {
          for (k = 0; k < 4; ++k) {
            pixelData[offset + j * rowStride + 4 * i + k] =
              subPixels[j * nRowStride + 4 * i + k]
          }
        }
      }
    }
  } else {
    _readPixels.call(
      this,
      x,
      y,
      width,
      height,
      format,
      type,
      pixelData)
  }
}

var _renderbufferStorage = gl.renderbufferStorage
gl.renderbufferStorage = function renderbufferStorage (
  target,
  internalformat,
  width,
  height) {
  target |= 0
  internalformat |= 0
  width |= 0
  height |= 0

  if (target !== gl.RENDERBUFFER) {
    setError(this, gl.INVALID_ENUM)
    return
  }

  var renderbuffer = this._activeRenderbuffer
  if (!renderbuffer) {
    setError(this, gl.INVALID_OPERATION)
    return
  }

  if (internalformat !== gl.RGBA4 &&
      internalformat !== gl.RGB565 &&
      internalformat !== gl.RGB5_A1 &&
      internalformat !== gl.DEPTH_COMPONENT16 &&
      internalformat !== gl.STENCIL_INDEX &&
      internalformat !== gl.STENCIL_INDEX8 &&
      internalformat !== gl.DEPTH_STENCIL) {
    setError(this, gl.INVALID_ENUM)
    return
  }

  saveError(this)
  _renderbufferStorage.call(
    this,
    target,
    internalformat,
    width,
    height)
  var error = this.getError()
  restoreError(this, error)
  if (error !== gl.NO_ERROR) {
    return
  }

  renderbuffer._width = width
  renderbuffer._height = height
  renderbuffer._format = internalformat

  var activeFramebuffer = this._activeFramebuffer
  if (activeFramebuffer) {
    var needsUpdate = false
    for (var i = 0; i < ATTACHMENTS.length; ++i) {
      if (activeFramebuffer._attachments[ATTACHMENTS[i]] === renderbuffer) {
        needsUpdate = true
      }
    }
    if (needsUpdate) {
      updateFramebufferAttachments(this._activeFramebuffer)
    }
  }
}

var _sampleCoverage = gl.sampleCoverage
gl.sampleCoverage = function sampleCoverage (value, invert) {
  return _sampleCoverage.call(this, +value, !!invert)
}

var _scissor = gl.scissor
gl.scissor = function scissor (x, y, width, height) {
  return _scissor.call(this, x | 0, y | 0, width | 0, height | 0)
}

function wrapShader (type, source) {
  return '#define gl_MaxDrawBuffers 1\n' + source
}

var _shaderSource = gl.shaderSource
gl.shaderSource = function shaderSource (shader, source) {
  if (!checkObject(shader)) {
    throw new TypeError('shaderSource(WebGLShader, String)')
  }
  if (!shader || (!source && typeof source !== 'string')) {
    setError(this, gl.INVALID_VALUE)
    return
  }
  source += ''
  if (!isValidString(source)) {
    setError(this, gl.INVALID_VALUE)
    return
  } else if (checkWrapper(this, shader, WebGLShader)) {
    _shaderSource.call(this, shader._ | 0, wrapShader(shader._type, source))
    shader._source = source
  }
}

var _stencilFunc = gl.stencilFunc
gl.stencilFunc = function stencilFunc (func, ref, mask) {
  return _stencilFunc.call(this, func | 0, ref | 0, mask | 0)
}

var _stencilFuncSeparate = gl.stencilFuncSeparate
gl.stencilFuncSeparate = function stencilFuncSeparate (face, func, ref, mask) {
  return _stencilFuncSeparate.call(this, face | 0, func | 0, ref | 0, mask | 0)
}

var _stencilMask = gl.stencilMask
gl.stencilMask = function stencilMask (mask) {
  return _stencilMask.call(this, mask | 0)
}

var _stencilMaskSeparate = gl.stencilMaskSeparate
gl.stencilMaskSeparate = function stencilMaskSeparate (face, mask) {
  return _stencilMaskSeparate.call(this, face | 0, mask | 0)
}

var _stencilOp = gl.stencilOp
gl.stencilOp = function stencilOp (fail, zfail, zpass) {
  return _stencilOp.call(this, fail | 0, zfail | 0, zpass | 0)
}

var _stencilOpSeparate = gl.stencilOpSeparate
gl.stencilOpSeparate = function stencilOpSeparate (face, fail, zfail, zpass) {
  return _stencilOpSeparate.call(this, face | 0, fail | 0, zfail | 0, zpass | 0)
}

function computePixelSize (context, type, internalformat) {
  var pixelSize = formatSize(internalformat)
  if (pixelSize === 0) {
    setError(context, gl.INVALID_ENUM)
    return 0
  }
  switch (type) {
    case gl.UNSIGNED_BYTE:
      return pixelSize
    case gl.UNSIGNED_SHORT_5_6_5:
      if (internalformat !== gl.RGB) {
        setError(context, gl.INVALID_OPERATION)
        break
      }
      return 2
    case gl.UNSIGNED_SHORT_4_4_4_4:
    case gl.UNSIGNED_SHORT_5_5_5_1:
      if (internalformat !== gl.RGBA) {
        setError(context, gl.INVALID_OPERATION)
        break
      }
      return 2
  }
  setError(context, gl.INVALID_ENUM)
  return 0
}

function checkDimensions (
  context,
  target,
  width,
  height,
  level) {
  if (level < 0 ||
    width < 0 ||
    height < 0) {
    setError(context, gl.INVALID_VALUE)
    return false
  }
  if (target === gl.TEXTURE_2D) {
    if (width > context._maxTextureSize ||
      height > context._maxTextureSize ||
      level > context._maxTextureLevel) {
      setError(context, gl.INVALID_VALUE)
      return false
    }
  } else if (validCubeTarget(target)) {
    if (width > context._maxCubeMapSize ||
      height > context._maxCubeMapSize ||
      level > context._maxCubeMapLevel) {
      setError(context, gl.INVALID_VALUE)
      return false
    }
  } else {
    setError(context, gl.INVALID_ENUM)
    return false
  }
  return true
}

function convertPixels (pixels) {
  if (typeof pixels === 'object' && pixels !== null) {
    if (pixels instanceof ArrayBuffer) {
      return new Uint8Array(pixels)
    } else if (pixels instanceof Uint8Array ||
      pixels instanceof Uint16Array ||
      pixels instanceof Uint8ClampedArray) {
      return unpackTypedArray(pixels)
    } else if (pixels instanceof Buffer) {
      return new Uint8Array(pixels)
    }
  }
  return null
}

function computeRowStride (context, width, pixelSize) {
  var rowStride = width * pixelSize
  if (rowStride % context._unpackAlignment) {
    rowStride += context._unpackAlignment - (rowStride % context._unpackAlignment)
  }
  return rowStride
}

function checkFormat (format) {
  return (
    format === gl.ALPHA ||
    format === gl.LUMINANCE_ALPHA ||
    format === gl.LUMINANCE ||
    format === gl.RGB ||
    format === gl.RGBA)
}

var _texImage2D = gl.texImage2D
gl.texImage2D = function texImage2D (
  target,
  level,
  internalformat,
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

    if (typeof pixels !== 'object' || typeof pixels.data !== 'object') {
      throw new TypeError('texImage2D(GLenum, GLint, GLenum, GLint, GLenum, GLenum, ImageData)')
    }
    width = pixels.width
    height = pixels.height
    pixels = pixels.data
  }

  target |= 0
  level |= 0
  internalformat |= 0
  width |= 0
  height |= 0
  border |= 0
  format |= 0
  type |= 0

  if (typeof pixels !== 'object' && pixels !== void 0) {
    throw new TypeError('texImage2D(GLenum, GLint, GLenum, GLint, GLint, GLint, GLenum, GLenum, Uint8Array)')
  }

  if (!checkFormat(format) || !checkFormat(internalformat)) {
    setError(this, gl.INVALID_ENUM)
    return
  }

  var texture = getTexImage(this, target)
  if (!texture || format !== internalformat) {
    setError(this, gl.INVALID_OPERATION)
    return
  }

  var pixelSize = computePixelSize(this, type, format)
  if (pixelSize === 0) {
    return
  }

  if (!checkDimensions(
      this,
      target,
      width,
      height,
      level)) {
    return
  }

  var data = convertPixels(pixels)
  var rowStride = computeRowStride(this, width, pixelSize)
  var imageSize = rowStride * height

  if (data && data.length < imageSize) {
    setError(this, gl.INVALID_OPERATION)
    return
  }

  if (border !== 0 ||
    (validCubeTarget(target) && width !== height)) {
    setError(this, gl.INVALID_VALUE)
    return
  }
  // Need to check for out of memory error
  saveError(this)
  _texImage2D.call(
    this,
    target,
    level,
    internalformat,
    width,
    height,
    border,
    format,
    type,
    data)
  var error = this.getError()
  restoreError(this, error)
  if (error !== gl.NO_ERROR) {
    return
  }

  // Save width and height at level
  texture._levelWidth[level] = width
  texture._levelHeight[level] = height
  texture._format = format
  texture._type = type

  var activeFramebuffer = this._activeFramebuffer
  if (activeFramebuffer) {
    var needsUpdate = false
    for (var i = 0; i < ATTACHMENTS.length; ++i) {
      if (activeFramebuffer._attachments[ATTACHMENTS[i]] === texture) {
        needsUpdate = true
      }
    }
    if (needsUpdate) {
      updateFramebufferAttachments(this._activeFramebuffer)
    }
  }
}

var _texSubImage2D = gl.texSubImage2D
gl.texSubImage2D = function texSubImage2D (
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

    if (typeof pixels !== 'object' || typeof pixels.data !== 'object') {
      throw new TypeError('texSubImage2D(GLenum, GLint, GLint, GLint, GLenum, GLenum, ImageData)')
    }
    width = pixels.width
    height = pixels.height
    pixels = pixels.data
  }

  if (typeof pixels !== 'object') {
    throw new TypeError('texSubImage2D(GLenum, GLint, GLint, GLint, GLint, GLint, GLenum, GLenum, Uint8Array)')
  }

  target |= 0
  level |= 0
  xoffset |= 0
  yoffset |= 0
  width |= 0
  height |= 0
  format |= 0
  type |= 0

  var texture = getTexImage(this, target)
  if (!texture) {
    setError(this, gl.INVALID_OPERATION)
    return
  }

  var pixelSize = computePixelSize(this, type, format)
  if (pixelSize === 0) {
    return
  }

  if (!checkDimensions(
      this,
      target,
      width,
      height,
      level)) {
    return
  }

  if (xoffset < 0 || yoffset < 0) {
    setError(this, gl.INVALID_VALUE)
    return
  }

  var data = convertPixels(pixels)
  var rowStride = computeRowStride(this, width, pixelSize)
  var imageSize = rowStride * height

  if (!data || data.length < imageSize) {
    setError(this, gl.INVALID_OPERATION)
    return
  }

  _texSubImage2D.call(
    this,
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

var _texParameterf = gl.texParameterf
gl.texParameterf = function texParameterf (target, pname, param) {
  target |= 0
  pname |= 0
  param = +param
  if (checkTextureTarget(this, target)) {
    switch (pname) {
      case gl.TEXTURE_MIN_FILTER:
      case gl.TEXTURE_MAG_FILTER:
      case gl.TEXTURE_WRAP_S:
      case gl.TEXTURE_WRAP_T:
        return _texParameterf.call(this, target, pname, param)
    }

    setError(this, gl.INVALID_ENUM)
    return
  }
}

var _texParameteri = gl.texParameteri
gl.texParameteri = function texParameteri (target, pname, param) {
  target |= 0
  pname |= 0
  param |= 0
  if (checkTextureTarget(this, target)) {
    switch (pname) {
      case gl.TEXTURE_MIN_FILTER:
      case gl.TEXTURE_MAG_FILTER:
      case gl.TEXTURE_WRAP_S:
      case gl.TEXTURE_WRAP_T:
        return _texParameterf.call(this, target, pname, param)
    }

    setError(this, gl.INVALID_ENUM)
    return
  }
}

function uniformTypeSize (type) {
  switch (type) {
    case gl.BOOL_VEC4:
    case gl.INT_VEC4:
    case gl.FLOAT_VEC4:
      return 4

    case gl.BOOL_VEC3:
    case gl.INT_VEC3:
    case gl.FLOAT_VEC3:
      return 3

    case gl.BOOL_VEC2:
    case gl.INT_VEC2:
    case gl.FLOAT_VEC2:
      return 2

    case gl.BOOL:
    case gl.INT:
    case gl.FLOAT:
    case gl.SAMPLER_2D:
    case gl.SAMPLER_CUBE:
      return 1

    default:
      return 0
  }
}

// Generate uniform binding code
function makeUniforms () {
  function makeMatrix (i) {
    var func = 'uniformMatrix' + i + 'fv'
    var native = gl[func]

    gl[func] = function (location, transpose, v) {
      if (!checkObject(location) ||
        typeof v !== 'object') {
        throw new TypeError(func + '(WebGLUniformLocation, Boolean, Array)')
      } else if (!!transpose ||
        typeof v !== 'object' ||
        v === null ||
        !v.length ||
        v.length % i * i !== 0) {
        setError(this, gl.INVALID_VALUE)
        return
      }
      if (!location) {
        return
      }
      if (!checkLocationActive(this, location)) {
        return
      }

      var data = new Float32Array(v)
      if (v.length === i * i) {
        return native.call(this,
          location._ | 0,
          !!transpose,
          data)
      } else if (location._array) {
        var arrayLocs = location._array
        for (var j = 0; j < arrayLocs.length && (j + 1) * i * i <= v.length; ++j) {
          native.call(this,
            arrayLocs[j],
            !!transpose,
            new Float32Array(data.subarray(j * i * i, (j + 1) * i * i)))
        }
      } else {
        setError(this, gl.INVALID_VALUE)
        return
      }
    }
  }

  for (var n = 1; n <= 4; ++n) {
    if (n > 1) {
      makeMatrix(n)
    }

    ['i', 'f'].forEach(function (type) {
      var i = n
      var func = 'uniform' + i + type
      var native = gl[func]

      var base = gl[func] = function (location, x, y, z, w) {
        if (!checkObject(location)) {
          throw new TypeError(func + '(WebGLUniformLocation, ...)')
        } else if (!location) {
          return
        } else if (checkLocationActive(this, location)) {
          var utype = location._activeInfo.type
          if (utype === gl.SAMPLER_2D ||
            utype === gl.SAMPLER_CUBE) {
            if (i !== 1) {
              setError(this, gl.INVALID_VALUE)
              return
            }
            if (type !== 'i') {
              setError(this, gl.INVALID_OPERATION)
              return
            }
            if (x < 0 || x >= this._textureUnits.length) {
              setError(this, gl.INVALID_VALUE)
              return
            }
          }
          if (uniformTypeSize(utype) > i) {
            setError(this, gl.INVALID_OPERATION)
            return
          }
          return native.call(this, location._ | 0, x, y, z, w)
        }
      }

      gl[func + 'v'] = function (location, v) {
        if (!checkObject(location) ||
          !checkObject(v)) {
          throw new TypeError(func + 'v(WebGLUniformLocation, Array)')
        } else if (!location) {
          return
        } else if (!checkLocationActive(this, location)) {
          return
        } else if (typeof v !== 'object' || !v || typeof v.length !== 'number') {
          throw new TypeError('Second argument to ' + func + 'v must be array')
        } else if (uniformTypeSize(location._activeInfo.type) > i) {
          setError(this, gl.INVALID_OPERATION)
          return
        } else if (v.length >= i &&
          v.length % i === 0) {
          if (location._array) {
            var arrayLocs = location._array
            for (var j = 0; j < arrayLocs.length && (j + 1) * i <= v.length; ++j) {
              var loc = arrayLocs[j]
              switch (i) {
                case 1:
                  native.call(this, loc, v[i * j])
                  break
                case 2:
                  native.call(this, loc, v[i * j], v[i * j + 1])
                  break
                case 3:
                  native.call(this, loc, v[i * j], v[i * j + 1], v[i * j + 2])
                  break
                case 4:
                  native.call(this, loc, v[i * j], v[i * j + 1], v[i * j + 2], v[i * j + 3])
                  break
              }
            }
            return
          } else if (v.length === i) {
            switch (i) {
              case 1:
                return base.call(this, location, v[0])
              case 2:
                return base.call(this, location, v[0], v[1])
              case 3:
                return base.call(this, location, v[0], v[1], v[2])
              case 4:
                return base.call(this, location, v[0], v[1], v[2], v[3])
            }
          } else {
            setError(this, gl.INVALID_OPERATION)
          }
        }
        setError(this, gl.INVALID_VALUE)
      }
    })
  }
}
makeUniforms()

function switchActiveProgram (active) {
  if (active) {
    active._refCount -= 1
    checkDelete(active)
  }
}

var _useProgram = gl.useProgram
gl.useProgram = function useProgram (program) {
  if (!checkObject(program)) {
    throw new TypeError('useProgram(WebGLProgram)')
  } else if (!program) {
    switchActiveProgram(this._activeProgram)
    this._activeProgram = null
    return _useProgram.call(this, 0)
  } else if (checkWrapper(this, program, WebGLProgram)) {
    if (this._activeProgram !== program) {
      switchActiveProgram(this._activeProgram)
      this._activeProgram = program
      program._refCount += 1
    }
    return _useProgram.call(this, program._ | 0)
  }
}

var _validateProgram = gl.validateProgram
gl.validateProgram = function validateProgram (program) {
  if (checkWrapper(this, program, WebGLProgram)) {
    _validateProgram.call(this, program._ | 0)
    var error = this.getError()
    if (error === gl.NO_ERROR) {
      program._linkInfoLog = _getProgramInfoLog.call(this, program._ | 0)
    }
    this.getError()
    setError(this, error)
  }
}

function makeVertexAttribs () {
  function makeVertex (i) {
    var func = 'vertexAttrib' + i + 'f'
    var native = gl[func]

    var base = gl[func] = function (idx, x, y, z, w) {
      idx |= 0
      if (idx < 0 || idx >= this._vertexAttribs.length) {
        setError(this, gl.INVALID_VALUE)
        return
      }
      var data = this._vertexAttribs[idx]._data
      data[3] = 1
      data[0] = data[1] = data[2] = 0.0
      switch (i) {
        case 4:
          data[3] = w
          data[2] = z
          data[1] = y
          data[0] = x
          break
        case 3:
          data[2] = z
          data[1] = y
          data[0] = x
          break
        case 2:
          data[1] = y
          data[0] = x
          break
        case 1:
          data[0] = x
          break
      }
      return native.call(this, idx | 0, +x, +y, +z, +w)
    }

    gl[func + 'v'] = function (idx, v) {
      if (typeof v === 'object' &&
        v !== null &&
        v.length >= i) {
        switch (i) {
          case 1:
            return base.call(this, idx | 0, +v[0], 0, 0, 0)
          case 2:
            return base.call(this, idx | 0, +v[0], +v[1], 0, 0)
          case 3:
            return base.call(this, idx | 0, +v[0], +v[1], +v[2], 0)
          case 4:
            return base.call(this, idx | 0, +v[0], +v[1], +v[2], +v[3])
        }
      }
      setError(this, gl.INVALID_OPERATION)
    }
  }
  for (var n = 1; n <= 4; ++n) makeVertex(n)
}
makeVertexAttribs()

var _vertexAttribPointer = gl.vertexAttribPointer
gl.vertexAttribPointer = function vertexAttribPointer (
  index,
  size,
  type,
  normalized,
  stride,
  offset) {
  if (stride < 0 || offset < 0) {
    setError(this, gl.INVALID_VALUE)
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
    index < 0 || index >= this._vertexAttribs.length ||
    !(size === 1 || size === 2 || size === 3 || size === 4)) {
    setError(this, gl.INVALID_VALUE)
    return
  }

  if (this._activeArrayBuffer === null) {
    setError(this, gl.INVALID_OPERATION)
    return
  }

  // fixed, int and unsigned int aren't allowed in WebGL
  var byteSize = typeSize(type)
  if (byteSize === 0 ||
    type === gl.INT ||
    type === gl.UNSIGNED_INT) {
    setError(this, gl.INVALID_ENUM)
    return
  }

  if (stride > 255 || stride < 0) {
    setError(this, gl.INVALID_VALUE)
    return
  }

  // stride and offset must be multiples of size
  if ((stride % byteSize) !== 0 ||
    (offset % byteSize) !== 0) {
    setError(this, gl.INVALID_OPERATION)
    return
  }

  // Call vertex attrib pointer
  _vertexAttribPointer.call(this, index, size, type, normalized, stride, offset)

  // Save attribute pointer state
  var attrib = this._vertexAttribs[index]

  if (attrib._pointerBuffer &&
    attrib._pointerBuffer !== this._activeArrayBuffer) {
    attrib._pointerBuffer._refCount -= 1
    checkDelete(attrib._pointerBuffer)
  }

  this._activeArrayBuffer._refCount += 1
  attrib._pointerBuffer = this._activeArrayBuffer
  attrib._pointerSize = size * byteSize
  attrib._pointerOffset = offset
  attrib._pointerStride = stride || (size * byteSize)
  attrib._pointerType = type
  attrib._pointerNormal = normalized
  attrib._inputStride = stride
  attrib._inputSize = size
}

var _viewport = gl.viewport
gl.viewport = function viewport (x, y, width, height) {
  return _viewport.call(this, x | 0, y | 0, width | 0, height | 0)
}

function allocateDrawingBuffer (context, width, height) {
  context._drawingBuffer = new WebGLDrawingBufferWrapper(
    _createFramebuffer.call(context),
    _createTexture.call(context),
    _createRenderbuffer.call(context))

  resizeDrawingBuffer(context, width, height)
}

exports.allocateDrawingBuffer = allocateDrawingBuffer

function resizeDrawingBuffer (context, width, height) {
  var prevFramebuffer = context._activeFramebuffer
  var prevTexture = activeTexture(context, gl.TEXTURE_2D)
  var prevRenderbuffer = context._activeRenderbuffer

  var contextAttributes = context._contextattributes

  var drawingBuffer = context._drawingBuffer
  _bindFramebuffer.call(context, gl.FRAMEBUFFER, drawingBuffer._framebuffer)

  // Clear all attachments
  for (var i = 0; i < ATTACHMENTS.length; ++i) {
    _framebufferTexture2D.call(
      context,
      gl.FRAMEBUFFER,
      ATTACHMENTS[i],
      gl.TEXTURE_2D,
      0,
      0)
  }

  // Update color attachment
  _bindTexture.call(
    context,
    gl.TEXTURE_2D,
    drawingBuffer._color)
  var colorFormat = contextAttributes.alpha ? gl.RGBA : gl.RGB
  _texImage2D.call(
    context,
    gl.TEXTURE_2D,
    0,
    colorFormat,
    width,
    height,
    0,
    colorFormat,
    gl.UNSIGNED_BYTE,
    null)
  _texParameteri.call(context, gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  _texParameteri.call(context, gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  _framebufferTexture2D.call(
    context,
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    drawingBuffer._color,
    0)

  // Update depth-stencil attachments if needed
  var storage = 0
  var attachment = 0
  if (contextAttributes.depth && contextAttributes.stencil) {
    storage = gl.DEPTH_STENCIL
    attachment = gl.DEPTH_STENCIL_ATTACHMENT
  } else if (contextAttributes.depth) {
    storage = 0x81A6 // Use 24 bit depth
    attachment = gl.DEPTH_ATTACHMENT
  } else if (contextAttributes.stencil) {
    storage = gl.STENCIL_INDEX8
    attachment = gl.STENCIL_ATTACHMENT
  }
  if (storage) {
    _bindRenderbuffer.call(
      context,
      gl.RENDERBUFFER,
      drawingBuffer._depthStencil)
    _renderbufferStorage.call(
      context,
      gl.RENDERBUFFER,
      storage,
      width,
      height)
    _framebufferRenderbuffer.call(
      context,
      gl.FRAMEBUFFER,
      attachment,
      gl.RENDERBUFFER,
      drawingBuffer._depthStencil)
  }

  // Restore previous binding state
  context.bindFramebuffer(gl.FRAMEBUFFER, prevFramebuffer)
  context.bindTexture(gl.TEXTURE_2D, prevTexture)
  context.bindRenderbuffer(gl.RENDERBUFFER, prevRenderbuffer)
}

gl.isContextLost = function () {
  return false
}

gl.compressedTexImage2D = function () {
  // TODO not yet implemented
}

gl.compressedTexSubImage2D = function () {
  // TODO not yet implemented
}
