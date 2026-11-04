const { Linkable } = require('./linkable')
const { gl } = require('./native-gl')

class WebGLFramebuffer extends Linkable {
  constructor (_, ctx) {
    super(_)
    this._ctx = ctx
    this._binding = 0

    this._width = 0
    this._height = 0
    this._status = null
    // The object at each attachment point and the id GL had for it. GL keeps an object attached to framebuffers that aren't bound when it's deleted, and may give its id to a new object.
    this._attachments = {}
  }

  _performDelete () {
    const ctx = this._ctx
    delete ctx._framebuffers[this._ | 0]
    gl.deleteFramebuffer.call(ctx, this._ | 0)
  }
}

module.exports = { WebGLFramebuffer }
