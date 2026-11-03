'use strict'

const tape = require('tape')
const createContext = require('../index')
const compileShader = require('./util/make-shader')
const drawPixel = require('./util/draw-pixel')

const fragDepthShader = `#extension GL_EXT_frag_depth : require
precision mediump float;
void main() {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  gl_FragDepthEXT = 0.25;
}`

tape('EXT_frag_depth: availability', function (t) {
  const gl = createContext(1, 1)
  t.ok(gl.getExtension('EXT_frag_depth'), 'available on WebGL1')
  gl.getExtension('STACKGL_destroy_context').destroy()

  const gl2 = createContext(1, 1, { createWebGL2Context: true })
  t.equal(gl2.getExtension('EXT_frag_depth'), null, 'not available on WebGL2, where GLSL ES 3.00 has gl_FragDepth')
  gl2.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('EXT_frag_depth: gl_FragDepthEXT', function (t) {
  const gl = createContext(1, 1)

  t.throws(() => compileShader(gl, gl.FRAGMENT_SHADER, fragDepthShader), /GL_EXT_frag_depth/, 'shaders that require it don\'t compile before it is enabled')
  gl.getExtension('EXT_frag_depth')

  // The second draw is at depth 0.5, so it only passes the GREATER test if the first draw wrote 0.25.
  gl.enable(gl.DEPTH_TEST)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  gl.depthFunc(gl.ALWAYS)
  t.deepEqual(drawPixel(gl, fragDepthShader), [255, 0, 0, 255], 'draws with a shader that writes gl_FragDepthEXT')
  gl.depthFunc(gl.GREATER)
  t.deepEqual(drawPixel(gl, `precision mediump float;
void main() {
  gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
}`), [0, 255, 0, 255], 'the depth buffer has the depth the shader wrote')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
