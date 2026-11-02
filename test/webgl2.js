'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawPixel = require('./util/draw-pixel')
const compileShader = require('./util/make-shader')

function readColors (gl, width, height) {
  const pixels = new Uint8Array(width * height * 4)
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
  const colors = new Set()
  for (let i = 0; i < pixels.length; i += 4) {
    colors.add(pixels.slice(i, i + 4).join())
  }
  return [...colors]
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

tape('webgl2: typed arrays that start partway into their buffer', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const pixel = new Uint8Array(4)

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_3D, texture)
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([1, 2, 3, 4, 255, 0, 0, 255]).subarray(4))
  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())
  gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, texture, 0, 0)
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
  t.deepEqual([...pixel], [255, 0, 0, 255], 'texImage3D')

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.clearBufferfv(gl.COLOR, 0, new Float32Array([1, 1, 1, 1, 0, 1, 0, 1]).subarray(4))
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
  t.deepEqual([...pixel], [0, 255, 0, 255], 'clearBufferfv')

  // getUniform doesn't return WebGL2's uniform types, so draw with each uniform and read the color instead.
  t.deepEqual(drawPixel(gl, `#version 300 es
precision highp float;
uniform uvec4 value;
out vec4 color;
void main() {
  color = vec4(value) / 255.0;
}`, program => gl.uniform4uiv(gl.getUniformLocation(program, 'value'), new Uint32Array([9, 9, 9, 9, 10, 20, 30, 255]).subarray(4))), [10, 20, 30, 255], 'uniform4uiv')

  t.deepEqual(drawPixel(gl, `#version 300 es
precision highp float;
uniform mat2x3 value;
out vec4 color;
void main() {
  color = vec4(value[1], 1.0);
}`, program => gl.uniformMatrix2x3fv(gl.getUniformLocation(program, 'value'), false, new Float32Array([9, 9, 9, 9, 9, 9, 0, 0, 0, 0.2, 0.4, 0.6]).subarray(6))), [51, 102, 153, 255], 'uniformMatrix2x3fv')

  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')
  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('webgl2: wrong argument types throw a TypeError', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  t.throws(() => gl.clearBufferfv(gl.COLOR, 0, 1), TypeError, 'clearBufferfv with a number')
  t.throws(() => gl.uniform4uiv(null, 'abcd'), TypeError, 'uniform4uiv with a string')
  t.throws(() => gl.vertexAttribI4uiv(1, {}), TypeError, 'vertexAttribI4uiv with an object that is not a sequence')
  t.throws(() => gl.getBufferSubData(gl.ARRAY_BUFFER, 0, [0, 0]), TypeError, 'getBufferSubData with an array')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('webgl2: methods that take typed arrays also take arrays', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const pixel = new Uint8Array(4)

  gl.clearBufferfv(gl.COLOR, 0, [0, 0, 1, 1])
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
  t.deepEqual([...pixel], [0, 0, 255, 255], 'clearBufferfv')

  t.deepEqual(drawPixel(gl, `#version 300 es
precision highp float;
flat in ivec4 passed;
out vec4 color;
void main() {
  color = vec4(passed) / 255.0;
}`, () => gl.vertexAttribI4iv(1, [10, 20, 30, 255]), `#version 300 es
layout(location = 0) in vec2 position;
layout(location = 1) in ivec4 value;
flat out ivec4 passed;
void main() {
  passed = value;
  gl_Position = vec4(position, 0.0, 1.0);
}`), [10, 20, 30, 255], 'vertexAttribI4iv')

  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')
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
