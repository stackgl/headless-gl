'use strict'

const tape = require('tape')
const createContext = require('../index')

const PROVOKING_VERTEX_WEBGL = 0x8E4F

// Draws one triangle over the pixel with a flat color: red at its first vertex, green at its second, blue at its last.
function drawFlatTriangle (gl) {
  function compile (type, source) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    return shader
  }
  const program = gl.createProgram()
  gl.attachShader(program, compile(gl.VERTEX_SHADER, `#version 300 es
in vec2 position;
in vec3 color;
flat out vec3 vColor;
void main() {
  vColor = color;
  gl_Position = vec4(position, 0.0, 1.0);
}`))
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `#version 300 es
precision mediump float;
flat in vec3 vColor;
out vec4 fragColor;
void main() {
  fragColor = vec4(vColor, 1.0);
}`))
  gl.bindAttribLocation(program, 0, 'position')
  gl.bindAttribLocation(program, 1, 'color')
  gl.linkProgram(program)
  gl.useProgram(program)

  const vertices = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, 0, 0,
    3, -1, 0, 1, 0,
    -1, 3, 0, 0, 1
  ]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 20, 0)
  gl.enableVertexAttribArray(1)
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 20, 8)

  gl.clearColor(0, 0, 0, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.drawArrays(gl.TRIANGLES, 0, 3)

  const pixel = new Uint8Array(4)
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
  gl.deleteBuffer(vertices)
  gl.deleteProgram(program)
  return Array.from(pixel)
}

tape('WEBGL_provoking_vertex: WebGL1', function (t) {
  const gl = createContext(1, 1)
  t.equal(gl.getExtension('WEBGL_provoking_vertex'), null, 'not available')
  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('WEBGL_provoking_vertex: WebGL2', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  t.equal(gl.getParameter(PROVOKING_VERTEX_WEBGL), null, 'getParameter returns null before it is enabled')
  t.equal(gl.getError(), gl.INVALID_ENUM, 'getParameter sets INVALID_ENUM before it is enabled')

  const ext = gl.getExtension('WEBGL_provoking_vertex')
  t.ok(ext, 'available')
  t.equal(ext.FIRST_VERTEX_CONVENTION_WEBGL, 0x8E4D, 'FIRST_VERTEX_CONVENTION_WEBGL')
  t.equal(ext.LAST_VERTEX_CONVENTION_WEBGL, 0x8E4E, 'LAST_VERTEX_CONVENTION_WEBGL')
  t.equal(ext.PROVOKING_VERTEX_WEBGL, PROVOKING_VERTEX_WEBGL, 'PROVOKING_VERTEX_WEBGL')

  t.equal(gl.getParameter(ext.PROVOKING_VERTEX_WEBGL), ext.LAST_VERTEX_CONVENTION_WEBGL, 'the last vertex convention at first')
  t.deepEqual(drawFlatTriangle(gl), [0, 0, 255, 255], 'flat varyings come from the last vertex')

  ext.provokingVertexWEBGL(ext.FIRST_VERTEX_CONVENTION_WEBGL)
  t.equal(gl.getParameter(ext.PROVOKING_VERTEX_WEBGL), ext.FIRST_VERTEX_CONVENTION_WEBGL, 'getParameter returns the first vertex convention once set')
  t.deepEqual(drawFlatTriangle(gl), [255, 0, 0, 255], 'flat varyings come from the first vertex')

  ext.provokingVertexWEBGL(gl.TRIANGLES)
  t.equal(gl.getError(), gl.INVALID_ENUM, 'another mode sets INVALID_ENUM')
  t.equal(gl.getParameter(ext.PROVOKING_VERTEX_WEBGL), ext.FIRST_VERTEX_CONVENTION_WEBGL, 'and leaves the convention as it was')

  ext.provokingVertexWEBGL(ext.LAST_VERTEX_CONVENTION_WEBGL)
  t.deepEqual(drawFlatTriangle(gl), [0, 0, 255, 255], 'the last vertex convention once set back')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
