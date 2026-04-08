'use strict'

const tape = require('tape')
const createContext = require('../index')
const makeShader = require('./util/make-program')

tape('attribute-weirdness', function (t) {
  const width = 2
  const height = 2

  function render (flipAttributes, flipLocations) {
    const gl = createContext(width, height)

    const attributes = [
      'attribute vec2 a_pos;',
      'attribute vec2 a_texture_pos;'
    ]

    if (flipAttributes) {
      attributes.reverse()
    }

    const vertexSrc = [
      'precision mediump float;',
      attributes[0],
      attributes[1],
      'varying vec2 v_pos0;',
      'void main() {',
      'v_pos0 = a_texture_pos;',
      'gl_Position = vec4(a_pos - 1.0, 0, 1);',
      '}'
    ].join('\n')

    const fragmentSrc = [
      'precision mediump float;',
      'varying vec2 v_pos0;',
      'void main() {',
      'gl_FragColor = vec4(v_pos0.x, 0.0, 0.0, 1.0);',
      '}'
    ].join('\n')

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    const program = makeShader(gl, vertexSrc, fragmentSrc)
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Int16Array([
        0, 0, 0, 0,
        4, 0, 1, 0,
        0, 4, 0, 1,
        4, 4, 1, 1
      ]),
      gl.STATIC_DRAW)

    let aPos = gl.getAttribLocation(program, 'a_pos')
    let aTexturePos = gl.getAttribLocation(program, 'a_texture_pos')

    gl.enableVertexAttribArray(aPos)
    gl.enableVertexAttribArray(aTexturePos)

    if (flipLocations) {
      const tmp = aPos
      aPos = aTexturePos
      aTexturePos = tmp
    }

    // console.log('locations:', aPos, aTexturePos)

    gl.vertexAttribPointer(aPos, 2, gl.SHORT, false, 8, 0)
    gl.vertexAttribPointer(aTexturePos, 2, gl.SHORT, false, 8, 4)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.deleteBuffer(buffer)

    // console.log('error:', gl.getError())

    const pixels = new Uint8Array(width * height * 4)
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    return pixels
  }

  // It should render a square covering the entire canvas.
  // The fragment shader sets a constant alpha value of 255 so we check for that.

  t.test('all alpha values should be 255', function (t) {
    const pixels = render(false, false)
    // print(pixels)
    let ok = true
    for (let i = 0; i < width * height * 4; i += 4) {
      if (pixels[i + 3] !== 255) ok = false
    }
    t.ok(ok)
    t.end()
  })

  // But if we flip the order the attributes are defined in the shader it works.
  t.test('when attributes are flipped all alpha values should be 255', function (t) {
    const pixels = render(true, false)
    // print(pixels)
    let ok = true
    for (let i = 0; i < width * height * 4; i += 4) {
      if (pixels[i + 3] !== 255) ok = false
    }
    t.ok(ok)
    t.end()
  })

  // even weirder, if we swap the attribute locations used when setting each pointer it works
  t.test('when attribute locations are swapped all alpha values should NOT be 255', function (t) {
    const pixels = render(false, true)
    // print(pixels)
    let ok = false
    for (let i = 0; i < width * height * 4; i += 4) {
      if (pixels[i + 3] !== 255) ok = true
    }
    t.ok(ok)
    t.end()
  })

  /*
  function print (pixels) {
    for (var i = 0; i < width * height * 4; i += 4) {
      console.log(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3])
    }
  }
  */

  t.end()
})
