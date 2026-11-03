'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawPixel = require('./util/draw-pixel')

const UNSIGNED_INT_24_8_WEBGL = 0x84FA

const DEPTH_TEXTURES = [
  ['DEPTH_COMPONENT', 'UNSIGNED_SHORT'],
  ['DEPTH_COMPONENT', 'UNSIGNED_INT'],
  ['DEPTH_STENCIL', 'UNSIGNED_INT_24_8_WEBGL']
]

function type (gl, name) {
  return name === 'UNSIGNED_INT_24_8_WEBGL' ? UNSIGNED_INT_24_8_WEBGL : gl[name]
}

function createTexture (gl) {
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  return texture
}

// Draws the red channel of the bound texture, where depth textures keep their depth.
function sampleRed (gl) {
  return drawPixel(gl, `precision mediump float;
uniform sampler2D sampler;
void main() {
  gl_FragColor = vec4(texture2D(sampler, vec2(0.5)).r, 0.0, 0.0, 1.0);
}`)[0]
}

tape('WEBGL_depth_texture: availability', function (t) {
  const gl = createContext(1, 1)
  const ext = gl.getExtension('WEBGL_depth_texture')
  t.ok(ext, 'available on WebGL1')
  t.equal(ext.UNSIGNED_INT_24_8_WEBGL, UNSIGNED_INT_24_8_WEBGL, 'UNSIGNED_INT_24_8_WEBGL')
  gl.getExtension('STACKGL_destroy_context').destroy()

  const gl2 = createContext(1, 1, { createWebGL2Context: true })
  t.equal(gl2.getExtension('WEBGL_depth_texture'), null, 'not available on WebGL2, which has depth textures built in')
  gl2.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('WEBGL_depth_texture: WebGL1 has no depth textures until the extension is enabled', function (t) {
  const gl = createContext(1, 1)
  createTexture(gl)
  for (const [format, typeName] of DEPTH_TEXTURES) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl[format], 1, 1, 0, gl[format], type(gl, typeName), null)
    t.equal(gl.getError(), gl.INVALID_ENUM, `${format} ${typeName} sets INVALID_ENUM`)
  }
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_SHORT, null)
  t.equal(gl.getError(), gl.INVALID_ENUM, 'and so does UNSIGNED_SHORT with RGBA')

  gl.getExtension('WEBGL_depth_texture')
  for (const [format, typeName] of DEPTH_TEXTURES) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl[format], 1, 1, 0, gl[format], type(gl, typeName), null)
    t.equal(gl.getError(), gl.NO_ERROR, `with the extension, ${format} ${typeName} sets no error`)
  }

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('WEBGL_depth_texture: depth textures are level 0 of a TEXTURE_2D, without data', function (t) {
  const gl = createContext(1, 1)
  gl.getExtension('WEBGL_depth_texture')

  for (const [format, typeName] of DEPTH_TEXTURES) {
    const f = gl[format]
    const ty = type(gl, typeName)
    const data = typeName === 'UNSIGNED_SHORT' ? new Uint16Array(1) : new Uint32Array(1)
    createTexture(gl)

    gl.texImage2D(gl.TEXTURE_2D, 1, f, 1, 1, 0, f, ty, null)
    t.equal(gl.getError(), gl.INVALID_OPERATION, `${format} ${typeName} at level 1 sets INVALID_OPERATION`)
    gl.texImage2D(gl.TEXTURE_2D, 0, f, 1, 1, 0, f, ty, data)
    t.equal(gl.getError(), gl.INVALID_OPERATION, 'with data sets INVALID_OPERATION')

    gl.bindTexture(gl.TEXTURE_CUBE_MAP, gl.createTexture())
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, f, 1, 1, 0, f, ty, null)
    t.equal(gl.getError(), gl.INVALID_OPERATION, 'in a cube map sets INVALID_OPERATION')

    gl.texImage2D(gl.TEXTURE_2D, 0, f, 1, 1, 0, f, ty, null)
    t.equal(gl.getError(), gl.NO_ERROR, 'level 0 of a TEXTURE_2D without data sets no error')
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 1, f, ty, data)
    t.equal(gl.getError(), gl.INVALID_OPERATION, 'texSubImage2D sets INVALID_OPERATION')
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, 1, 1)
    t.equal(gl.getError(), gl.INVALID_OPERATION, 'copyTexSubImage2D sets INVALID_OPERATION')
    gl.generateMipmap(gl.TEXTURE_2D)
    t.equal(gl.getError(), gl.INVALID_OPERATION, 'generateMipmap sets INVALID_OPERATION')
    // The extension says INVALID_OPERATION, but its conformance test also takes INVALID_ENUM, which ANGLE and browsers set.
    gl.copyTexImage2D(gl.TEXTURE_2D, 0, f, 0, 0, 1, 1, 0)
    t.ok([gl.INVALID_ENUM, gl.INVALID_OPERATION].includes(gl.getError()), 'copyTexImage2D sets INVALID_ENUM or INVALID_OPERATION')
    gl.texImage2D(gl.TEXTURE_2D, 0, f, f, ty, { width: 1, height: 1, data: new Uint8ClampedArray(4) })
    t.notEqual(gl.getError(), gl.NO_ERROR, 'an image sets an error')
  }

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('WEBGL_depth_texture: rendering depth to a texture and sampling it', function (t) {
  const gl = createContext(1, 1)
  gl.getExtension('WEBGL_depth_texture')

  for (const typeName of ['UNSIGNED_SHORT', 'UNSIGNED_INT']) {
    const texture = createTexture(gl)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, 4, 4, 0, gl.DEPTH_COMPONENT, gl[typeName], null)

    const framebuffer = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, texture, 0)
    t.equal(gl.checkFramebufferStatus(gl.FRAMEBUFFER), gl.FRAMEBUFFER_COMPLETE, `a ${typeName} depth texture alone makes a complete framebuffer`)
    gl.clearDepth(0.4)
    gl.clear(gl.DEPTH_BUFFER_BIT)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    t.equal(sampleRed(gl), 102, 'and sampling it gives the depth it was cleared to in red')

    // A DEPTH_COMPONENT texture can only be the depth attachment.
    gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.TEXTURE_2D, texture, 0)
    t.notEqual(gl.checkFramebufferStatus(gl.FRAMEBUFFER), gl.FRAMEBUFFER_COMPLETE, 'as the depth-stencil attachment, the framebuffer is incomplete')
    gl.clear(gl.DEPTH_BUFFER_BIT)
    t.equal(gl.getError(), gl.INVALID_FRAMEBUFFER_OPERATION, 'and clearing it sets INVALID_FRAMEBUFFER_OPERATION')
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('WEBGL_depth_texture: rendering depth and stencil to a DEPTH_STENCIL texture', function (t) {
  const gl = createContext(1, 1)
  gl.getExtension('WEBGL_depth_texture')
  const texture = createTexture(gl)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_STENCIL, 4, 4, 0, gl.DEPTH_STENCIL, UNSIGNED_INT_24_8_WEBGL, null)
  const color = createTexture(gl)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, 4, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)

  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.TEXTURE_2D, texture, 0)
  t.equal(gl.checkFramebufferStatus(gl.FRAMEBUFFER), gl.FRAMEBUFFER_COMPLETE, 'as the depth-stencil attachment, the framebuffer is complete')

  gl.clearDepth(0.4)
  gl.clearStencil(1)
  gl.clear(gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT)
  gl.enable(gl.STENCIL_TEST)
  const red = `precision mediump float;
void main() {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}`
  gl.stencilFunc(gl.EQUAL, 1, 0xFF)
  t.deepEqual(drawPixel(gl, red), [255, 0, 0, 255], 'drawing passes a stencil test for the value it was cleared to')
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.stencilFunc(gl.EQUAL, 0, 0xFF)
  t.deepEqual(drawPixel(gl, red), [0, 0, 0, 0], 'and fails one for another value')
  gl.disable(gl.STENCIL_TEST)

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  t.equal(sampleRed(gl), 102, 'sampling it gives the depth it was cleared to in red')

  // A DEPTH_STENCIL texture can only be the depth-stencil attachment.
  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, texture, 0)
  t.notEqual(gl.checkFramebufferStatus(gl.FRAMEBUFFER), gl.FRAMEBUFFER_COMPLETE, 'as the depth attachment, the framebuffer is incomplete')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
