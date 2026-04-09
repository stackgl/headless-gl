const { gl } = require('../native-gl')

class ANGLEInstancedArrays {
  constructor (ctx) {
    this.VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE = 0x88fe
    this.ctx = ctx

    this._drawArraysInstancedANGLE = gl._drawArraysInstancedANGLE.bind(ctx)
    this._drawElementsInstancedANGLE = gl._drawElementsInstancedANGLE.bind(ctx)
    this._vertexAttribDivisorANGLE = gl._vertexAttribDivisorANGLE.bind(ctx)
  }

  drawArraysInstancedANGLE (mode, first, count, primCount) {
    this._drawArraysInstancedANGLE(mode | 0, first | 0, count >>> 0, primCount >>> 0)
  }

  drawElementsInstancedANGLE (mode, count, type, ioffset, primCount) {
    this._drawElementsInstancedANGLE(mode | 0, count | 0, type | 0, ioffset | 0, primCount >>> 0)
  }

  vertexAttribDivisorANGLE (index, divisor) {
    this._vertexAttribDivisorANGLE(index >>> 0, divisor >>> 0)
  }
}

function getANGLEInstancedArrays (ctx) {
  return new ANGLEInstancedArrays(ctx)
}

module.exports = { ANGLEInstancedArrays, getANGLEInstancedArrays }
