'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawPixel = require('./util/draw-pixel')

// Samples past the right edge of the texture, which REPEAT wraps around to the first texel and CLAMP_TO_EDGE holds at the last.
const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
uniform sampler2D tex;
out vec4 color;
void main() {
  color = texture(tex, vec2(1.25, 0.5));
}`

tape('samplers: createSampler returns a WebGLSampler', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  const sampler = gl.createSampler()
  t.equal(sampler.constructor.name, 'WebGLSampler', 'createSampler returns a WebGLSampler')
  t.equal(gl.isSampler(sampler), true, 'which isSampler accepts')

  t.equal(gl.getParameter(gl.SAMPLER_BINDING), null, 'SAMPLER_BINDING is null by default')
  gl.bindSampler(0, sampler)
  t.equal(gl.getParameter(gl.SAMPLER_BINDING), sampler, 'and the sampler once it\'s bound to the active texture unit')
  gl.activeTexture(gl.TEXTURE1)
  t.equal(gl.getParameter(gl.SAMPLER_BINDING), null, 'and null for another texture unit')
  gl.activeTexture(gl.TEXTURE0)

  gl.samplerParameteri(sampler, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.samplerParameterf(sampler, gl.TEXTURE_MAX_LOD, 2.5)
  t.equal(gl.getSamplerParameter(sampler, gl.TEXTURE_MIN_FILTER), gl.NEAREST, 'samplerParameteri sets a parameter')
  t.equal(gl.getSamplerParameter(sampler, gl.TEXTURE_MAX_LOD), 2.5, 'and so does samplerParameterf')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  t.equal(gl.getSamplerParameter(sampler, gl.TEXTURE_BASE_LEVEL), null, 'getSamplerParameter returns null for a parameter samplers don\'t have')
  t.equal(gl.getError(), gl.INVALID_ENUM, 'and sets INVALID_ENUM')

  gl.deleteSampler(sampler)
  t.equal(gl.getParameter(gl.SAMPLER_BINDING), null, 'deleting it unbinds it')
  t.equal(gl.isSampler(sampler), false, 'and isSampler returns false for it')
  gl.deleteSampler(sampler)
  gl.deleteSampler(null)
  t.equal(gl.getError(), gl.NO_ERROR, 'deleting it again, or deleting null, does nothing')

  gl.bindSampler(0, sampler)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'bindSampler sets INVALID_OPERATION for a deleted sampler')
  gl.samplerParameteri(sampler, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'and so does samplerParameteri')
  gl.samplerParameterf(sampler, gl.TEXTURE_MAX_LOD, 1)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'and samplerParameterf')
  t.equal(gl.getSamplerParameter(sampler, gl.TEXTURE_MIN_FILTER), null, 'getSamplerParameter returns null for it')
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'and sets INVALID_OPERATION')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('samplers: a bound sampler overrides the texture\'s parameters', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 255, 0, 0, 255, 255]))
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  t.deepEqual(drawPixel(gl, FRAGMENT_SHADER), [255, 0, 0, 255], 'the texture repeats without a sampler')

  const sampler = gl.createSampler()
  gl.samplerParameteri(sampler, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.samplerParameteri(sampler, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.bindSampler(0, sampler)
  t.deepEqual(drawPixel(gl, FRAGMENT_SHADER), [0, 0, 255, 255], 'and is clamped with the sampler bound')

  gl.bindSampler(0, null)
  t.deepEqual(drawPixel(gl, FRAGMENT_SHADER), [255, 0, 0, 255], 'and repeats again once it\'s unbound')
  t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

tape('samplers: errors', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })
  const other = createContext(1, 1, { createWebGL2Context: true })
  const sampler = gl.createSampler()
  const otherSampler = other.createSampler()

  t.equal(gl.isSampler(null), false, 'isSampler returns false for null')
  t.equal(gl.isSampler(otherSampler), false, 'and for another context\'s sampler')
  gl.deleteSampler(otherSampler)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'deleteSampler sets INVALID_OPERATION for another context\'s sampler')
  t.equal(other.isSampler(otherSampler), true, 'and leaves it')
  gl.bindSampler(0, otherSampler)
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'bindSampler sets INVALID_OPERATION for another context\'s sampler')
  t.equal(gl.getSamplerParameter(otherSampler, gl.TEXTURE_MIN_FILTER), null, 'getSamplerParameter returns null for another context\'s sampler')
  t.equal(gl.getError(), gl.INVALID_OPERATION, 'and sets INVALID_OPERATION')

  gl.bindSampler(gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS), sampler)
  t.equal(gl.getError(), gl.INVALID_VALUE, 'bindSampler sets INVALID_VALUE for a texture unit past the last')

  // The sampler is 1, so these would take the GL id of a sampler if they took numbers.
  t.throws(() => gl.isSampler(1), TypeError, 'isSampler throws a TypeError for a number')
  t.throws(() => gl.deleteSampler(1), TypeError, 'and so does deleteSampler')
  t.throws(() => gl.bindSampler(0, 1), TypeError, 'and bindSampler')
  t.throws(() => gl.samplerParameteri(1, gl.TEXTURE_MIN_FILTER, gl.NEAREST), TypeError, 'and samplerParameteri')
  t.throws(() => gl.samplerParameterf(1, gl.TEXTURE_MAX_LOD, 1), TypeError, 'and samplerParameterf')
  t.throws(() => gl.getSamplerParameter(1, gl.TEXTURE_MIN_FILTER), TypeError, 'and getSamplerParameter')
  t.throws(() => gl.samplerParameteri(null, gl.TEXTURE_MIN_FILTER, gl.NEAREST), TypeError, 'samplerParameteri throws a TypeError for null')
  t.throws(() => gl.getSamplerParameter(null, gl.TEXTURE_MIN_FILTER), TypeError, 'and so does getSamplerParameter')
  t.equal(gl.getError(), gl.NO_ERROR, 'without setting an error')

  other.getExtension('STACKGL_destroy_context').destroy()
  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})
