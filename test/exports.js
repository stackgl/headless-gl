'use strict'

const tape = require('tape')
const createContext = require('../index')

tape('exports for ES modules', async function (t) {
  // Node finds the named exports of a CommonJS file by scanning it for assignments like module.exports.WebGLRenderingContext = …, so they disappear without an error if index.js stops assigning them that way.
  const namespace = await import('../index.js')
  t.equal(namespace.default, createContext, 'the default export is createContext')
  t.equal(namespace.WebGLRenderingContext, createContext.WebGLRenderingContext, 'WebGLRenderingContext is a named export')
  t.equal(namespace.WebGL2RenderingContext, createContext.WebGL2RenderingContext, 'WebGL2RenderingContext is a named export')
})
