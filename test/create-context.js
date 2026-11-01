'use strict'

const tape = require('tape')
const createContext = require('../index')

tape('create context', function (t) {
  const width = 10
  const height = 10
  createContext(width, height)
  t.end()
})

tape('create context with an invalid size', function (t) {
  t.throws(() => createContext(0, 10), RangeError)
  t.throws(() => createContext(10, -1), RangeError)
  t.throws(() => createContext(NaN, 10), RangeError)
  t.end()
})

tape('create context with only the methods of its WebGL version', function (t) {
  const gl = createContext(1, 1)
  t.ok(gl instanceof createContext.WebGLRenderingContext, 'is a WebGLRenderingContext')
  t.notOk(gl instanceof createContext.WebGL2RenderingContext, 'is not a WebGL2RenderingContext')
  t.equal(Object.prototype.toString.call(gl), '[object WebGLRenderingContext]', 'has the WebGLRenderingContext string tag')
  t.equal(typeof gl.drawArrays, 'function', 'has WebGL1 methods')
  t.equal(gl.createVertexArray, undefined, 'has no WebGL2 methods')
  t.equal(gl.TEXTURE_3D, undefined, 'has no WebGL2 constants')
  t.equal(gl.destroy, undefined, 'has no destroy method')
  t.deepEqual(Object.getOwnPropertyNames(gl).filter(name => name.startsWith('_')), [], 'has no internals')
  gl.getExtension('STACKGL_destroy_context').destroy()

  const gl2 = createContext(1, 1, { createWebGL2Context: true })
  t.ok(gl2 instanceof createContext.WebGL2RenderingContext, 'is a WebGL2RenderingContext')
  t.equal(Object.prototype.toString.call(gl2), '[object WebGL2RenderingContext]', 'has the WebGL2RenderingContext string tag')
  t.equal(typeof gl2.drawArrays, 'function', 'WebGL2 has WebGL1 methods')
  t.equal(typeof gl2.createVertexArray, 'function', 'WebGL2 has WebGL2 methods')
  t.equal(typeof gl2.TEXTURE_3D, 'number', 'WebGL2 has WebGL2 constants')
  gl2.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('context classes can\'t be constructed directly', function (t) {
  t.throws(() => new createContext.WebGLRenderingContext(), TypeError)
  t.throws(() => new createContext.WebGL2RenderingContext(), TypeError)
  t.end()
})
