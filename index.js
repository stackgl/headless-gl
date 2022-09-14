if (typeof WebGLRenderingContext !== 'undefined') {
  module.exports = require('./src/javascript/browser-index')
} else {
  module.exports = require('./src/javascript/node-index')
}
module.exports.WebGLRenderingContext = require('./src/javascript/webgl-rendering-context').WebGLRenderingContext
