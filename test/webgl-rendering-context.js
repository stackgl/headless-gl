'use strict'

const tape = require('tape')
const WebGLRenderingContext = require('../index').WebGLRenderingContext

tape('use WebGLRenderingContext', function (t) {
  t.equals(!!WebGLRenderingContext, true)
  t.equals(!!WebGLRenderingContext.STATIC_DRAW, true)
  t.equals(!!WebGLRenderingContext.STENCIL_TEST, true)
  t.equals(!!WebGLRenderingContext.FRAMEBUFFER, true)
  t.end()
})
