'use strict'

const tape = require('tape')
const createContext = require('../index')

function readColors (gl, width, height) {
  const pixels = new Uint8Array(width * height * 4)
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
  const colors = new Set()
  for (let i = 0; i < pixels.length; i += 4) {
    colors.add(pixels.slice(i, i + 4).join())
  }
  return [...colors]
}

function compileShader (gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader))
  }
  return shader
}

tape('webgl2: create context', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  t.ok(gl instanceof createContext.WebGL2RenderingContext, 'is a WebGL2RenderingContext')
  t.ok(gl.getParameter(gl.VERSION).startsWith('WebGL 2.0 '), 'VERSION is WebGL 2.0')
  t.ok(gl.getParameter(gl.SHADING_LANGUAGE_VERSION).startsWith('WebGL GLSL ES 3.00 '), 'SHADING_LANGUAGE_VERSION is WebGL GLSL ES 3.00')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('webgl2: clear color', function (t) {
  const width = 10
  const height = 10
  const gl = createContext(width, height, { createWebGL2Context: true })

  gl.clearColor(1, 0, 0, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)
  t.deepEqual(readColors(gl, width, height), ['255,0,0,255'], 'every pixel is red')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('webgl2: texImage3D without data', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  gl.bindTexture(gl.TEXTURE_3D, gl.createTexture())

  t.doesNotThrow(() => gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 2, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, null), 'accepts null')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL error with null')
  t.doesNotThrow(() => gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 2, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE), 'accepts no data argument')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL error without a data argument')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('webgl2: draw with a GLSL ES 3.00 shader and a vertex array object', function (t) {
  const width = 10
  const height = 10
  const gl = createContext(width, height, { createWebGL2Context: true })

  const program = gl.createProgram()
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`))
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, `#version 300 es
precision mediump float;
out vec4 color;
void main() {
  color = vec4(0.0, 1.0, 0.0, 1.0);
}`))
  gl.linkProgram(program)
  t.ok(gl.getProgramParameter(program, gl.LINK_STATUS), 'program links')

  // One triangle that covers the whole drawing buffer.
  const vertexArray = gl.createVertexArray()
  gl.bindVertexArray(vertexArray)
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const position = gl.getAttribLocation(program, 'position')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  gl.bindVertexArray(null)

  gl.clearColor(1, 0, 0, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.useProgram(program)
  gl.bindVertexArray(vertexArray)
  gl.drawArrays(gl.TRIANGLES, 0, 3)

  t.deepEqual(readColors(gl, width, height), ['0,255,0,255'], 'every pixel is green')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
