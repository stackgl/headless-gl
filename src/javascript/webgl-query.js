class WebGLQuery {
  constructor (_, ctx) {
    this._ = _
    this._ctx = ctx
    // GL ties a query to the target of its first beginQuery.
    this._target = 0
  }
}

module.exports = { WebGLQuery }
