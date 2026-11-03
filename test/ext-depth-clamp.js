'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawPixel = require('./util/draw-pixel')

const DEPTH_CLAMP_EXT = 0x864F

// Draws green beyond the far plane, where it's clipped unless depth clamping is on.
function drawBeyondFarPlane (gl) {
  gl.clearColor(1, 0, 0, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)
  return drawPixel(gl, `precision mediump float;
void main() {
  gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
}`, null, `attribute vec2 position;
void main() {
  gl_Position = vec4(position, 2.0, 1.0);
}`)
}

for (const webgl2 of [false, true]) {
  tape(`EXT_depth_clamp: WebGL${webgl2 ? 2 : 1}`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })

    gl.enable(DEPTH_CLAMP_EXT)
    t.equal(gl.getError(), gl.INVALID_ENUM, 'enable sets INVALID_ENUM before it is enabled')

    const ext = gl.getExtension('EXT_depth_clamp')
    t.ok(ext, 'available')
    t.equal(ext.DEPTH_CLAMP_EXT, DEPTH_CLAMP_EXT, 'DEPTH_CLAMP_EXT')
    t.equal(gl.getParameter(ext.DEPTH_CLAMP_EXT), false, 'getParameter returns false at first')
    t.deepEqual(drawBeyondFarPlane(gl), [255, 0, 0, 255], 'geometry beyond the far plane is clipped')

    gl.enable(ext.DEPTH_CLAMP_EXT)
    t.equal(gl.isEnabled(ext.DEPTH_CLAMP_EXT), true, 'isEnabled returns true once enabled')
    t.equal(gl.getParameter(ext.DEPTH_CLAMP_EXT), true, 'getParameter returns true once enabled')
    t.deepEqual(drawBeyondFarPlane(gl), [0, 255, 0, 255], 'geometry beyond the far plane is drawn')

    gl.disable(ext.DEPTH_CLAMP_EXT)
    t.equal(gl.isEnabled(ext.DEPTH_CLAMP_EXT), false, 'isEnabled returns false once disabled')
    t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}
