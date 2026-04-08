'use strict'

const tape = require('tape')
const createContext = require('../index')
const drawTriangle = require('./util/draw-triangle')
const makeShader = require('./util/make-program')

const width = 2
const height = 2
const gl = createContext(width, height)

const getVec4 = function (array) {
  return 'vec4(' + array[0] + ',' + array[1] + ',' + array[2] + ',' + array[3] + ');'
}

const tests = [
  {
    name: 'Blend: ADD ONE ONE',
    equn: gl.FUNC_ADD,
    func1: gl.ONE,
    func2: gl.ONE,
    dstColor: [0.5, 0.5, 0.5, 1],
    srcColor: getVec4([0.5, 0.5, 0.5, 1]),
    expectedColor: [1, 1, 1, 1]
  },

  {
    name: 'BLend: ADD ONE ZERO',
    equn: gl.FUNC_ADD,
    func1: gl.ONE,
    func2: gl.ZERO,
    dstColor: [0.5, 0.5, 0.5, 0.5],
    srcColor: getVec4([0.2, 0.2, 0.2, 1]),
    expectedColor: [0.2, 0.2, 0.2, 1]
  },

  {
    name: 'BLEND: ADD ZERO SRC',
    equn: gl.FUNC_ADD,
    func1: gl.ZERO,
    func2: gl.SRC_COLOR,
    dstColor: [0.8, 0.8, 0.8, 1],
    srcColor: getVec4([0.5, 0.5, 0.5, 0.5]),
    expectedColor: [0.4, 0.4, 0.4, 0.5]
  },

  {
    name: 'Blend: ADD DST ZERO',
    equn: gl.FUNC_ADD,
    func1: gl.DST_COLOR,
    func2: gl.ZERO,
    dstColor: [0.8, 0.8, 0.8, 1],
    srcColor: getVec4([0.5, 0.5, 0.5, 0.5]),
    expectedColor: [0.4, 0.4, 0.4, 0.5]
  },

  {
    name: 'Blend: ADD SRC_ALPHA ONE_MINUS_SRC_ALPHA',
    equn: gl.FUNC_ADD,
    func1: gl.SRC_ALPHA,
    func2: gl.ONE_MINUS_SRC_ALPHA,
    dstColor: [0.5, 0, 0.5, 1],
    srcColor: getVec4([0.5, 1, 0, 0.5]),
    expectedColor: [0.5, 0.5, 0.25, 0.75]
  }
]

for (let j = 0; j < tests.length; j++) {
  const test = tests[j]
  tape(test.name, function (t) {
    const vertexSrc = [
      'precision mediump float;',
      'attribute vec2 position;',
      'void main() {',
      'gl_Position = vec4(position,0,1);',
      '}'
    ].join('\n')

    const fragmentSrc = [
      'precision mediump float;',
      'void main() {',
      'gl_FragColor = ' + test.srcColor,
      '}'
    ].join('\n')

    gl.clearColor(test.dstColor[0], test.dstColor[1], test.dstColor[2], test.dstColor[3])
    gl.clear(gl.COLOR_BUFFER_BIT)

    const program = makeShader(gl, vertexSrc, fragmentSrc)

    gl.useProgram(program)

    gl.enable(gl.BLEND)
    gl.blendEquation(test.equn)
    gl.blendFunc(test.func1, test.func2)

    drawTriangle(gl)

    t.equals(gl.getError(), gl.NO_ERROR)

    gl.disable(gl.BLEND)

    const pixels = new Uint8Array(width * height * 4)
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

    for (let i = 0; i < width * height * 4; i += 4) {
      t.ok(Math.abs(pixels[i] - test.expectedColor[0] * 255) < 3, 'red')
      t.ok(Math.abs(pixels[i] - test.expectedColor[0] * 255) < 3, 'green')
      t.ok(Math.abs(pixels[i] - test.expectedColor[0] * 255) < 3, 'blue')
      t.ok(Math.abs(pixels[i] - test.expectedColor[0] * 255) < 3, 'alpha')
    }

    t.end()
  })
}
