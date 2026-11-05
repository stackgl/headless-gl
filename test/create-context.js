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
  const constants = Object.getOwnPropertyNames(gl2).filter(name => /^[A-Z]/.test(name))
  t.deepEqual(constants.filter(name => createContext.WebGL2RenderingContext[name] !== gl2[name]), [], 'WebGL2RenderingContext has every constant as a static property')
  t.equal(createContext.WebGLRenderingContext.TEXTURE_3D, undefined, 'WebGLRenderingContext has no WebGL2 constants as static properties')
  gl2.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('context classes can\'t be constructed directly', function (t) {
  t.throws(() => new createContext.WebGLRenderingContext(), TypeError)
  t.throws(() => new createContext.WebGL2RenderingContext(), TypeError)
  t.end()
})

tape('create context: changing what getContextAttributes returns changes nothing', function (t) {
  const gl = createContext(1, 1)
  gl.getContextAttributes().depth = false
  t.equal(gl.getContextAttributes().depth, true, 'getContextAttributes returns a new object each time')
  gl.getExtension('STACKGL_resize_drawingbuffer').resize(2, 2)
  t.equal(gl.getParameter(gl.DEPTH_BITS), 24, 'and a resized drawing buffer keeps its depth')
  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('create context: getContextAttributes reports the standard attributes', function (t) {
  const gl = createContext(1, 1)
  t.deepEqual(gl.getContextAttributes(), {
    alpha: true,
    depth: true,
    stencil: false,
    antialias: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'default',
    failIfMajorPerformanceCaveat: false,
    desynchronized: false,
    xrCompatible: false,
    createWebGL2Context: false
  }, 'with their defaults, and createWebGL2Context')
  gl.getExtension('STACKGL_destroy_context').destroy()

  for (const value of ['low-power', 'high-performance']) {
    const other = createContext(1, 1, { powerPreference: value, desynchronized: true, xrCompatible: true })
    const attributes = other.getContextAttributes()
    t.deepEqual([attributes.powerPreference, attributes.desynchronized, attributes.xrCompatible], [value, true, true], `as they were asked for, such as powerPreference ${value}`)
    other.getExtension('STACKGL_destroy_context').destroy()
  }
  t.throws(() => createContext(1, 1, { powerPreference: 'fast' }), TypeError, 'createContext throws a TypeError for a powerPreference that isn\'t one of its values')
  t.end()
})
