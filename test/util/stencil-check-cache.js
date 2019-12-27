var tape = require('tape')
var { WebGLRenderingContext } = require('../../src/javascript/webgl-rendering-context')
var createContext = require('../../src/javascript/node-index')

tape('stencil check cache - gl.stencilFunc()', function (t) {
  var gl = new WebGLRenderingContext()
  t.equals(gl._checkStencil, undefined, 'gl._checkStencil starts undefined')
  gl.destroy()
  t.end()
})

tape('stencil check cache - gl.stencilFunc()', function (t) {
  var gl = new WebGLRenderingContext()
  gl.stencilFunc()
  t.equals(gl._checkStencil, true, 'gl.stencilFunc() calls set gl._checkStencil to true')
  gl.destroy()
  t.end()
})

tape('stencil check cache - gl.stencilFuncSeparate()', function (t) {
  var gl = new WebGLRenderingContext()
  gl.stencilFuncSeparate()
  t.equals(gl._checkStencil, true, 'gl.stencilFuncSeparate() calls set gl._checkStencil to true')
  gl.destroy()
  t.end()
})

tape('stencil check cache - gl.stencilMask()', function (t) {
  var gl = new WebGLRenderingContext()
  gl.stencilMask()
  t.equals(gl._checkStencil, true, 'gl.stencilMask() calls set gl._checkStencil to true')
  gl.destroy()
  t.end()
})

tape('stencil check cache - gl.stencilMaskSeparate()', function (t) {
  var gl = new WebGLRenderingContext()
  gl.stencilMaskSeparate()
  t.equals(gl._checkStencil, true, 'gl.stencilMaskSeparate() calls set gl._checkStencil to true')
  gl.destroy()
  t.end()
})

tape('stencil check cache - gl.stencilOp()', function (t) {
  var gl = new WebGLRenderingContext()
  gl.stencilOp()
  t.equals(gl._checkStencil, true, 'gl.stencilOp() calls set gl._checkStencil to true')
  gl.destroy()
  t.end()
})

tape('stencil check cache - gl.stencilOpSeparate()', function (t) {
  var gl = new WebGLRenderingContext()
  gl.stencilOpSeparate()
  t.equals(gl._checkStencil, true, 'gl.stencilOpSeparate() calls set gl._checkStencil to true')
  gl.destroy()
  t.end()
})

tape('stencil check cache - gl.clearStencil()', function (t) {
  var gl = new WebGLRenderingContext()
  gl.clearStencil()
  t.equals(gl._checkStencil, false, 'gl.clearStencil() calls set gl._checkStencil to false')
  gl.destroy()
  t.end()
})

tape('stencil check cache - gl._checkStencilState() without errors', function (t) {
  var gl = new WebGLRenderingContext()
  gl._checkStencil = true
  t.equals(gl._checkStencilState(), true, 'gl._checkStencilState() value is cached and returned')
  t.equals(gl._checkStencil, false, 'gl._checkStencilState() calls set gl._checkStencil to false')
  t.equals(gl._stencilState, true, 'gl._checkStencilState() calls set gl._stencilState to true')
  gl._stencilState = 'test value'
  gl.getParameter = function () {
    throw new Error('should not be called!')
  }
  t.equals(gl._checkStencilState(), 'test value', 'subsequent gl._checkStencilState() calls use the cached state stored in gl._stencilState')
  gl.destroy()
  t.end()
})

tape('stencil check cache - gl._checkStencilState() with errors', function (t) {
  var gl = new WebGLRenderingContext()
  gl._checkStencil = true
  gl.getParameter = function (stencil) {
    if (stencil === gl.STENCIL_WRITEMASK) return 1
  }
  t.equals(gl._checkStencilState(), false, 'gl._checkStencilState() value is cached and returned')
  t.equals(gl._checkStencil, false, 'gl._checkStencilState() calls set gl._checkStencil to false')
  t.equals(gl._stencilState, false, 'gl._checkStencilState() calls set gl._stencilState to true')
  gl._stencilState = 'test value'
  gl.getParameter = function () {
    throw new Error('should not be called!')
  }
  t.equals(gl._checkStencilState(), 'test value', 'subsequent gl._checkStencilState() calls use the cached state stored in gl._stencilState')
  gl.destroy()
  t.end()
})

tape('stencil check cache - createContext initial state', function (t) {
  var gl = createContext(1, 1)
  gl.getParameter = function () {
    throw new Error('should not be called!')
  }
  gl._stencilState = 'test value'
  t.equals(gl._checkStencilState(), true, 'initial call to createContext()._checkStencilState() return gl._stencilState and not call gl.getParameter()')
  gl.destroy()
  t.end()
})
