const { Linkable } = require('./linkable')
const { gl } = require('./native-gl')
const { WebGLVertexArrayObjectState } = require('./webgl-vertex-attribute')

class WebGLVertexArrayObject extends Linkable {
  constructor (_, ctx) {
    super(_)
    this._ctx = ctx
    this._vertexState = new WebGLVertexArrayObjectState(ctx)
  }

  _performDelete () {
    // Clean up the vertex state to release references to buffers.
    this._vertexState.cleanUp()

    delete this._vertexState
    delete this._ctx._vaos[this._]
    gl.deleteVertexArray.call(this._ctx, this._ | 0)
  }
}

module.exports = { WebGLVertexArrayObject }
