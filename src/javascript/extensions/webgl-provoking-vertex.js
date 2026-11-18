const { gl } = require('../native-gl')

class WebGLProvokingVertex {
  constructor (ctx) {
    this.FIRST_VERTEX_CONVENTION_WEBGL = 0x8E4D
    this.LAST_VERTEX_CONVENTION_WEBGL = 0x8E4E
    this.PROVOKING_VERTEX_WEBGL = 0x8E4F

    this._ctx = ctx
  }

  // ANGLE's GL_ANGLE_provoking_vertex sets INVALID_ENUM for any other mode, as the WebGL extension does.
  provokingVertexWEBGL (provokeMode) {
    gl.provokingVertexANGLE.call(this._ctx, provokeMode | 0)
  }
}

function getWebGLProvokingVertex (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('WEBGL_provoking_vertex') >= 0) {
    result = new WebGLProvokingVertex(context)
  }

  return result
}

module.exports = { getWebGLProvokingVertex, WebGLProvokingVertex }
