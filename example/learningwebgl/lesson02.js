/* globals __line */
var mat4 = require('gl-matrix').mat4
var path = require('path')
var createContext = require('../../index')
var utils = require('../common/utils.js')
var utils_log = require('../common/utils_log.js')
var log = new utils_log.Log(path.basename(__filename), 'DEBUG')

function Scene (width, height) {
  var gl = this.gl = createContext(width, height)
  gl.viewportWidth = width
  gl.viewportHeight = height

  this.mvMatrix = mat4.create()
  this.pMatrix = mat4.create()
}

Scene.prototype = {
  begin: function () {
    var gl = this.gl
    this.initShaders()
    this.initBuffers()

    gl.clearColor(0.0, 0.0, 0.0, 1.0)
    gl.enable(gl.DEPTH_TEST)
  },
  initShaders: function () {
    var gl = this.gl

    var vertex_src = `
        attribute vec3 aVertexPosition;
        attribute vec4 aVertexColor;

        uniform mat4 uMVMatrix;
        uniform mat4 uPMatrix;

        varying vec4 vColor;

        void main(void) {
            gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
            vColor = aVertexColor;
        }
    `

    var fragment_src = `
        precision mediump float;

        varying vec4 vColor;

        void main(void) {
            gl_FragColor = vColor;
        }
    `

    var shaderProgram = this.shaderProgram = utils.createProgramFromSources(gl, [vertex_src, fragment_src])
    gl.useProgram(shaderProgram)

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'aVertexPosition')
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute)

    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, 'aVertexColor')
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute)

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, 'uPMatrix')
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, 'uMVMatrix')
  },
  setMatrixUniforms: function () {
    var gl = this.gl
    var shaderProgram = this.shaderProgram
    var mvMatrix = this.mvMatrix
    var pMatrix = this.pMatrix

    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix)
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix)
  },
  initBuffers: function () {
    var gl = this.gl
    var triangleVertexPositionBuffer = this.triangleVertexPositionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer)
    var vertices = [
      0.0, 1.0, 0.0,
      -1.0, -1.0, 0.0,
      1.0, -1.0, 0.0
    ]
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
    triangleVertexPositionBuffer.itemSize = 3
    triangleVertexPositionBuffer.numItems = 3

    var triangleVertexColorBuffer = this.triangleVertexColorBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer)
    var colors = [
      1.0, 0.0, 0.0, 1.0,
      0.0, 1.0, 0.0, 1.0,
      0.0, 0.0, 1.0, 1.0
    ]
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW)
    triangleVertexColorBuffer.itemSize = 4
    triangleVertexColorBuffer.numItems = 3

    var squareVertexPositionBuffer = this.squareVertexPositionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer)
    vertices = [
      1.0, 1.0, 0.0,
      -1.0, 1.0, 0.0,
      1.0, -1.0, 0.0,
      -1.0, -1.0, 0.0
    ]
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
    squareVertexPositionBuffer.itemSize = 3
    squareVertexPositionBuffer.numItems = 4

    var squareVertexColorBuffer = this.squareVertexColorBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer)
    colors = []
    for (var i = 0; i < 4; i++) {
      colors = colors.concat([0.5, 0.5, 1.0, 1.0])
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW)
    squareVertexColorBuffer.itemSize = 4
    squareVertexColorBuffer.numItems = 4
  },
  draw: function () {
    var gl = this.gl
    var pMatrix = this.pMatrix
    var mvMatrix = this.mvMatrix
    var triangleVertexPositionBuffer = this.triangleVertexPositionBuffer
    var triangleVertexColorBuffer = this.triangleVertexColorBuffer
    var squareVertexPositionBuffer = this.squareVertexPositionBuffer
    var squareVertexColorBuffer = this.squareVertexColorBuffer
    var shaderProgram = this.shaderProgram

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    mat4.perspective(pMatrix, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0)

    mat4.identity(mvMatrix)

    mat4.translate(mvMatrix, mvMatrix, [-1.5, 0.0, -7.0])
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer)
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, triangleVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer)
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, triangleVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0)

    this.setMatrixUniforms()
    gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPositionBuffer.numItems)

    mat4.translate(mvMatrix, mvMatrix, [3.0, 0.0, 0.0])
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer)
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer)
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, squareVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0)

    this.setMatrixUniforms()
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems)
  },
  render: function () {
    var gl = this.gl

    this.draw()

    var files = [
      utils.replaceExt(__filename, '.ppm')
    ]

    for (var i = 0; i < files.length; i++) {
      var filename = files[i]
      log.info(__line, 'rendering ' + filename)
      utils.bufferToFile(gl, gl.viewportWidth, gl.viewportHeight, filename)
      log.info(__line, 'finished rendering ' + filename)
    }
  },
  end: function () {
    var gl = this.gl
    gl.destroy()
  }
}

function main () {
  var scene = new Scene(512, 512)
  scene.begin()
  scene.render()
  scene.end()
}

main()
