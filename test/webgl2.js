'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawPixel = require('./util/draw-pixel')
const compileShader = require('./util/make-shader')
const makeProgram = require('./util/make-program')

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

tape('webgl2: texImage3D with data that is too short', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  gl.bindTexture(gl.TEXTURE_3D, gl.createTexture())

  // 2 by 2 by 2 RGBA8 pixels take 32 bytes.
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 2, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'texImage3D sets INVALID_OPERATION')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('webgl2: 3D uploads from typed arrays with UNPACK_FLIP_Y_WEBGL or UNPACK_PREMULTIPLY_ALPHA_WEBGL', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  gl.bindTexture(gl.TEXTURE_3D, gl.createTexture())
  const data = new Uint8Array(4)

  for (const pname of ['UNPACK_FLIP_Y_WEBGL', 'UNPACK_PREMULTIPLY_ALPHA_WEBGL']) {
    gl.pixelStorei(gl[pname], true)
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
    t.equal(gl.getError(), gl.INVALID_OPERATION, `texImage3D sets INVALID_OPERATION with ${pname}`)
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    t.equal(gl.getError(), gl.NO_ERROR, `texImage3D without data has no GL error with ${pname}`)
    gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, data)
    t.equal(gl.getError(), gl.INVALID_OPERATION, `texSubImage3D sets INVALID_OPERATION with ${pname}`)
    gl.pixelStorei(gl[pname], false)
  }

  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
  gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, data)
  t.equal(gl.getError(), gl.NO_ERROR, 'both work once they are false')

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

tape('webgl2: texture uploads take every kind of typed array', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

  // Draws the integer texture's color divided by 255.
  function sample (sampler) {
    return drawPixel(gl, `#version 300 es
precision highp float;
precision highp ${sampler};
uniform ${sampler} sampler;
out vec4 color;
void main() {
  color = vec4(texture(sampler, vec2(0.5))) / 255.0;
}`)
  }

  const cases = [
    ['RGBA32UI', gl.RGBA_INTEGER, gl.UNSIGNED_INT, Uint32Array, 'usampler2D'],
    ['RGBA32I', gl.RGBA_INTEGER, gl.INT, Int32Array, 'isampler2D'],
    ['RGBA16I', gl.RGBA_INTEGER, gl.SHORT, Int16Array, 'isampler2D'],
    ['RGBA8I', gl.RGBA_INTEGER, gl.BYTE, Int8Array, 'isampler2D']
  ]
  for (const [internalFormat, format, type, TypedArray, sampler] of cases) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl[internalFormat], 1, 1, 0, format, type, new TypedArray([10, 20, 30, 127]))
    t.deepEqual(sample(sampler), [10, 20, 30, 127], `texImage2D with ${TypedArray.name}`)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 1, format, type, new TypedArray([40, 50, 60, 127]))
    t.deepEqual(sample(sampler), [40, 50, 60, 127], `texSubImage2D with ${TypedArray.name}`)
  }

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8UI, 1, 1, 0, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, new DataView(new Uint8Array([10, 20, 30, 127]).buffer))
  t.deepEqual(sample('usampler2D'), [10, 20, 30, 127], 'texImage2D with a DataView')

  // Node 24 and later have Float16Array, which HALF_FLOAT data can come in.
  if (globalThis.Float16Array) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 1, 1, 0, gl.RGBA, gl.HALF_FLOAT, new globalThis.Float16Array([10, 20, 30, 127]))
    t.deepEqual(sample('sampler2D'), [10, 20, 30, 127], 'texImage2D with a Float16Array')
  }

  // A DataView made in another realm, such as a vm context, isn't an instance of this realm's DataView.
  const otherRealmView = require('vm').runInNewContext('new DataView(new Uint8Array([10, 20, 30, 127]).buffer)')
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8UI, 1, 1, 0, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, otherRealmView)
  t.deepEqual(sample('usampler2D'), [10, 20, 30, 127], 'texImage2D with a DataView from another realm')
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

  t.deepEqual(drawPixel(gl, `#version 300 es
precision highp float;
uniform uvec4 value;
out vec4 color;
void main() {
  color = vec4(value) / 255.0;
}`, program => gl.uniform4uiv(gl.getUniformLocation(program, 'value'), [10, 20, 30, 255])), [10, 20, 30, 255], 'uniform4uiv')

  t.deepEqual(drawPixel(gl, `#version 300 es
precision highp float;
uniform mat2x3 value;
out vec4 color;
void main() {
  color = vec4(value[1], 1.0);
}`, program => gl.uniformMatrix2x3fv(gl.getUniformLocation(program, 'value'), false, [0, 0, 0, 0.2, 0.4, 0.6])), [51, 102, 153, 255], 'uniformMatrix2x3fv')

  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')
  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('webgl2: uniform methods set the uniform at its location', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  // Each shader subtracts first from second, so a value set on second that lands on first comes out black.
  function twoUniforms (type, expression) {
    return `#version 300 es
precision highp float;
uniform ${type} first;
uniform ${type} second;
out vec4 color;
void main() {
  color = ${expression};
}`
  }
  const integers = twoUniforms('uvec4', '(vec4(second) - vec4(first)) / 255.0')
  t.deepEqual(drawPixel(gl, integers, program => gl.uniform4ui(gl.getUniformLocation(program, 'second'), 10, 20, 30, 255)), [10, 20, 30, 255], 'uniform4ui')
  t.deepEqual(drawPixel(gl, integers, program => gl.uniform4uiv(gl.getUniformLocation(program, 'second'), new Uint32Array([10, 20, 30, 255]))), [10, 20, 30, 255], 'uniform4uiv')
  const matrices = twoUniforms('mat2x3', 'vec4(second[1] - first[1], 1.0)')
  t.deepEqual(drawPixel(gl, matrices, program => gl.uniformMatrix2x3fv(gl.getUniformLocation(program, 'second'), false, new Float32Array([0, 0, 0, 0.2, 0.4, 0.6]))), [51, 102, 153, 255], 'uniformMatrix2x3fv')

  gl.uniform4uiv(null, new Uint32Array([1, 2, 3, 4]))
  t.equal(gl.getError(), gl.NO_ERROR, 'a null location is ignored')

  let otherProgramLocation
  drawPixel(gl, integers, program => { otherProgramLocation = gl.getUniformLocation(program, 'second') })
  drawPixel(gl, integers, () => gl.uniform4ui(otherProgramLocation, 1, 2, 3, 4))
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'a location from another program sets INVALID_OPERATION')

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

tape('webgl2: drawBuffers and readBuffer take every color attachment', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())
  for (let i = 0; i < 2; i++) {
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, 1, 1)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, texture, 0)
  }

  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1])
  t.equal(gl.getError(), gl.NO_ERROR, 'drawBuffers has no GL error')
  t.deepEqual(drawPixel(gl, `#version 300 es
precision mediump float;
layout(location = 0) out vec4 color0;
layout(location = 1) out vec4 color1;
void main() {
  color0 = vec4(1.0, 0.0, 0.0, 1.0);
  color1 = vec4(0.0, 1.0, 0.0, 1.0);
}`), [255, 0, 0, 255], 'the first output is drawn to COLOR_ATTACHMENT0')

  gl.readBuffer(gl.COLOR_ATTACHMENT1)
  const pixel = new Uint8Array(4)
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
  t.deepEqual([...pixel], [0, 255, 0, 255], 'and the second to COLOR_ATTACHMENT1, which readBuffer reads from')

  gl.drawBuffers([gl.NONE, gl.COLOR_ATTACHMENT1])
  t.equal(gl.getParameter(gl.DRAW_BUFFER0), gl.NONE, 'drawBuffers takes NONE')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('webgl2: clearBuffer methods with too few values', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true, depth: true, stencil: true })

  gl.clearBufferfv(gl.COLOR, 0, new Float32Array(3))
  t.equal(gl.getError(), gl.INVALID_VALUE, 'clearBufferfv sets INVALID_VALUE with 3 values for COLOR')
  gl.clearBufferiv(gl.STENCIL, 0, [])
  t.equal(gl.getError(), gl.INVALID_VALUE, 'clearBufferiv sets INVALID_VALUE with no value for STENCIL')
  gl.clearBufferfv(gl.DEPTH, 0, [0.5])
  t.equal(gl.getError(), gl.NO_ERROR, 'clearBufferfv takes 1 value for DEPTH')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('webgl2: vertexAttribI4iv and vertexAttribI4uiv with too few values', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  gl.vertexAttribI4iv(0, [7])
  t.equal(gl.getError(), gl.INVALID_VALUE, 'vertexAttribI4iv sets INVALID_VALUE with 1 value')
  gl.vertexAttribI4uiv(0, new Uint32Array(3))
  t.equal(gl.getError(), gl.INVALID_VALUE, 'vertexAttribI4uiv sets INVALID_VALUE with 3 values')
  gl.vertexAttribI4uiv(0, new Uint32Array(4))
  t.equal(gl.getError(), gl.NO_ERROR, 'and takes 4')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('webgl2: getVertexAttrib returns the values of integer attributes', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const current = index => gl.getVertexAttrib(index, gl.CURRENT_VERTEX_ATTRIB)

  gl.vertexAttribI4i(1, -1, 2, 3, 4)
  t.ok(current(1) instanceof Int32Array, 'vertexAttribI4i makes it an Int32Array')
  t.deepEqual([...current(1)], [-1, 2, 3, 4], 'with its values')
  gl.vertexAttribI4ui(2, 1, 2, 3, 0xFFFFFFFF)
  t.ok(current(2) instanceof Uint32Array, 'vertexAttribI4ui makes it a Uint32Array')
  t.deepEqual([...current(2)], [1, 2, 3, 0xFFFFFFFF], 'with its values')
  gl.vertexAttribI4iv(3, [5, 6, 7, 8])
  t.deepEqual([...current(3)], [5, 6, 7, 8], 'vertexAttribI4iv')
  gl.vertexAttribI4uiv(4, new Uint32Array([9, 10, 11, 12]))
  t.deepEqual([...current(4)], [9, 10, 11, 12], 'vertexAttribI4uiv')

  gl.vertexAttrib4f(1, 0.5, 1, 2, 3)
  t.ok(current(1) instanceof Float32Array, 'vertexAttrib4f makes it a Float32Array again')
  t.deepEqual([...current(1)], [0.5, 1, 2, 3], 'with its values')

  gl.vertexAttribI4i(gl.getParameter(gl.MAX_VERTEX_ATTRIBS), 1, 2, 3, 4)
  t.equal(gl.getError(), gl.INVALID_VALUE, 'vertexAttribI4i sets INVALID_VALUE with an index out of range')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('webgl2: uniform*uiv and non-square uniformMatrix*fv with data of the wrong length', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const program = makeProgram(gl, `#version 300 es
in vec4 position;
void main() {
  gl_Position = position;
}`, `#version 300 es
precision mediump float;
uniform uvec4 u;
uniform mat2x3 m;
out vec4 color;
void main() {
  color = vec4(u) + vec4(m[0], m[1].x);
}`)
  gl.useProgram(program)
  const u = gl.getUniformLocation(program, 'u')
  const m = gl.getUniformLocation(program, 'm')

  gl.uniform4uiv(u, new Uint32Array(3))
  t.equal(gl.getError(), gl.INVALID_VALUE, 'uniform4uiv sets INVALID_VALUE with 3 values')
  gl.uniform4uiv(u, new Uint32Array(5))
  t.equal(gl.getError(), gl.INVALID_VALUE, 'and with 5')
  gl.uniformMatrix2x3fv(m, false, new Float32Array(5))
  t.equal(gl.getError(), gl.INVALID_VALUE, 'uniformMatrix2x3fv sets INVALID_VALUE with 5 values')
  gl.uniform4uiv(u, new Uint32Array(4))
  gl.uniformMatrix2x3fv(m, false, new Float32Array(6))
  t.equal(gl.getError(), gl.NO_ERROR, 'both take a whole number of values')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('webgl2: getInternalformatParameter returns every sample count', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  const samples = gl.getInternalformatParameter(gl.RENDERBUFFER, gl.RGBA8, gl.SAMPLES)
  t.ok(samples instanceof Int32Array, 'SAMPLES is an Int32Array')
  t.ok(samples.length > 0, 'with at least one sample count')
  t.equal(samples[0], gl.getParameter(gl.MAX_SAMPLES), 'starting from MAX_SAMPLES')
  t.deepEqual([...samples], [...samples].sort((a, b) => b - a), 'in descending order')
  gl.bindRenderbuffer(gl.RENDERBUFFER, gl.createRenderbuffer())
  for (const count of samples) {
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, count, gl.RGBA8, 1, 1)
  }
  t.equal(gl.getError(), gl.NO_ERROR, 'each of which makes a renderbuffer')

  t.equal(gl.getInternalformatParameter(gl.RENDERBUFFER, gl.RGBA8, 0x9380), null, 'returns null for NUM_SAMPLE_COUNTS, which WebGL leaves out')
  t.equal(gl.getError(), gl.INVALID_ENUM, 'and sets INVALID_ENUM')
  t.equal(gl.getInternalformatParameter(gl.RENDERBUFFER, gl.RGB9_E5, gl.SAMPLES), null, 'returns null for a format that can\'t be rendered to')
  t.equal(gl.getError(), gl.INVALID_ENUM, 'and sets INVALID_ENUM')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('webgl2: getSamplerParameter returns float parameters as floats', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const sampler = gl.createSampler()

  gl.samplerParameterf(sampler, gl.TEXTURE_MIN_LOD, 1.5)
  gl.samplerParameterf(sampler, gl.TEXTURE_MAX_LOD, 2.25)
  gl.samplerParameteri(sampler, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  t.equal(gl.getSamplerParameter(sampler, gl.TEXTURE_MIN_LOD), 1.5, 'TEXTURE_MIN_LOD')
  t.equal(gl.getSamplerParameter(sampler, gl.TEXTURE_MAX_LOD), 2.25, 'TEXTURE_MAX_LOD')
  t.equal(gl.getSamplerParameter(sampler, gl.TEXTURE_MIN_FILTER), gl.NEAREST, 'and the others still as integers')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('webgl2: texParameterf sets WebGL2\'s texture parameters', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  gl.bindTexture(gl.TEXTURE_3D, gl.createTexture())

  gl.texParameterf(gl.TEXTURE_3D, gl.TEXTURE_MIN_LOD, -1.5)
  gl.texParameterf(gl.TEXTURE_3D, gl.TEXTURE_MAX_LOD, 2.5)
  gl.texParameterf(gl.TEXTURE_3D, gl.TEXTURE_BASE_LEVEL, 1)
  t.equal(gl.getError(), gl.NO_ERROR, 'TEXTURE_MIN_LOD, TEXTURE_MAX_LOD and TEXTURE_BASE_LEVEL set no error')
  gl.texParameterf(gl.TEXTURE_3D, gl.TEXTURE_IMMUTABLE_FORMAT, 1)
  t.equal(gl.getError(), gl.INVALID_ENUM, 'a parameter that can\'t be set still sets INVALID_ENUM')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
