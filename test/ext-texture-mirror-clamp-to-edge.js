'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawPixel = require('./util/draw-pixel')

const MIRROR_CLAMP_TO_EDGE_EXT = 0x8743

for (const webgl2 of [false, true]) {
  tape(`EXT_texture_mirror_clamp_to_edge: WebGL${webgl2 ? 2 : 1}`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })

    // A red texel and a green texel.
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]))
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, MIRROR_CLAMP_TO_EDGE_EXT)
    t.equal(gl.getError(), gl.INVALID_ENUM, 'texParameteri sets INVALID_ENUM before it is enabled')

    const ext = gl.getExtension('EXT_texture_mirror_clamp_to_edge')
    t.ok(ext, 'available')
    t.equal(ext.MIRROR_CLAMP_TO_EDGE_EXT, MIRROR_CLAMP_TO_EDGE_EXT, 'MIRROR_CLAMP_TO_EDGE_EXT')
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, ext.MIRROR_CLAMP_TO_EDGE_EXT)
    t.equal(gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S), ext.MIRROR_CLAMP_TO_EDGE_EXT, 'getTexParameter returns it')

    // -0.75 mirrors to the green texel, where CLAMP_TO_EDGE would give red. 1.75 clamps to the green edge, where MIRRORED_REPEAT would give red.
    const shader = `precision mediump float;
uniform sampler2D sampler;
uniform float s;
void main() {
  gl_FragColor = texture2D(sampler, vec2(s, 0.5));
}`
    t.deepEqual(drawPixel(gl, shader, program => gl.uniform1f(gl.getUniformLocation(program, 's'), -0.75)), [0, 255, 0, 255], 'mirrors coordinates below 0')
    t.deepEqual(drawPixel(gl, shader, program => gl.uniform1f(gl.getUniformLocation(program, 's'), 1.75)), [0, 255, 0, 255], 'clamps coordinates above 1 to the edge')
    t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}
