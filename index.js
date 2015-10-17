'use strict'

var bits = require('bit-twiddle')
var webgl = require('./webgl')

var CONTEXT_COUNTER = 0

function flag(options, name, dflt) {
  if(!options || !(typeof options === 'object') || !(name in options)) {
    return dflt
  }
  return !!options[name]
}

function createContext(width, height, options) {
  width  = width|0
  height = height|0
  if(!(width >= 0 && height >= 0)) {
    throw new Error('Invalid dimensions for context')
  }

  var contextAttributes = new webgl.WebGLContextAttributes(
    flag(options, 'alpha', true),
    flag(options, 'depth', true),
    flag(options, 'stencil', false),
    flag(options, 'antialias', true),
    flag(options, 'premultipliedAlpha', true),
    flag(options, 'preserveDrawingBuffer', false),
    flag(options, 'preferLowPowerToHighPerformance', false),
    flag(options, 'failIfMajorPerformanceCaveat', false))

  //Can only use premultipliedAlpha if alpha is set
  contextAttributes.premultipliedAlpha =
    contextAttributes.premultipliedAlpha && contextAttributes.alpha

  var gl = new webgl.WebGLRenderingContext(
    1,
    1,
    contextAttributes.alpha,
    contextAttributes.depth,
    contextAttributes.stencil,
    contextAttributes.antialias,
    contextAttributes.premultipliedAlpha,
    contextAttributes.preserveDrawingBuffer,
    contextAttributes.preferLowPowerToHighPerformance,
    contextAttributes.failIfMajorPerformanceCaveat)

  gl.drawingBufferWidth  = width
  gl.drawingBufferHeight = height

  gl._ = CONTEXT_COUNTER++

  gl._contextattributes = contextAttributes

  gl._programs      = {}
  gl._shaders       = {}
  gl._buffers       = {}
  gl._textures      = {}
  gl._framebuffers  = {}
  gl._renderbuffers = {}

  gl._activeProgram            = null
  gl._activeFramebuffer        = null
  gl._activeArrayBuffer        = null
  gl._activeElementArrayBuffer = null
  gl._activeRenderbuffer       = null

  //Initialize texture units
  var numTextures = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)
  gl._textureUnits = new Array(numTextures)
  for(var i=0; i<numTextures; ++i) {
    gl._textureUnits[i] = new webgl.WebGLTextureUnit(i)
  }
  gl._activeTextureUnit = 0
  gl.activeTexture(gl.TEXTURE0)

  gl._errorStack = []

  gl.isContextLost = false

  //Initialize vertex attributes
  var numAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS)
  gl._vertexAttribs = new Array(numAttribs)
  for(var i=0; i<numAttribs; ++i) {
    gl._vertexAttribs[i] = new webgl.WebGLVertexAttribute(gl, i)
  }

  //Store limits
  gl._maxTextureSize  = gl.getParameter(gl.MAX_TEXTURE_SIZE)
  gl._maxTextureLevel = bits.log2(bits.nextPow2(gl._maxTextureSize))
  gl._maxCubeMapSize  = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE)
  gl._maxCubeMapLevel = bits.log2(bits.nextPow2(gl._maxCubeMapSize))

  //Unpack alignment
  gl._unpackAlignment = 4
  gl._packAlignment   = 4

  //Allocate framebuffer
  webgl.allocateDrawingBuffer(gl, width, height)

  var attrib0Buffer = gl.createBuffer()
  gl._attrib0Buffer = attrib0Buffer

  //Initialize defaults
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.bindRenderbuffer(gl.RENDERBUFFER, null)

  //Set viewport and scissor
  gl.viewport(0, 0, width, height)
  gl.scissor(0, 0, width, height)

  //Clear buffers
  gl.clearDepth(1)
  gl.clearColor(0, 0, 0, 0)
  gl.clearStencil(0)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT)

  return gl
}

module.exports = createContext
