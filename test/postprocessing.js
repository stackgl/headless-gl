'use strict'

var tape = require('tape')
var createContext = require('./../index.js')
var THREE = require('./vendor/three.js')

tape('ThreeJS Postprocessing Effects', function (t) {
  var width = 2
  var height = 2

  var gl = createContext(width, height)

  // Set up scene
  var scene = new THREE.Scene()

  var camera = new THREE.PerspectiveCamera(75, width / height, 1, 10000)
  camera.position.z = 5

  var geometry = new THREE.BoxGeometry(10, 10, 1)
  var material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: false })

  var mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)

  var canvas = {}

  var renderer = new THREE.WebGLRenderer({
    antialias: true,
    width: 0,
    height: 0,
    canvas: canvas,
    context: gl
  })

  renderer.setClearColor(0x000000)
  renderer.clear()

  function checkPixels () {
    var pixels = new Uint8Array(4 * width * height)

    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

    for (var i = 0; i < width * height * 4; i += 4) {
      var r = pixels[i]
      var g = pixels[i + 1]
      var b = pixels[i + 2]
      var a = pixels[i + 3]
      t.equals(r, 255, 'red')
      t.equals(g, 255, 'green')
      t.equals(b, 255, 'blue')
      t.equals(a, 255, 'alpha')
    }
  }

  // Run tests
  t.test('Single RenderPass', function (t) {
    var composer = new THREE.EffectComposer(renderer)

    var renderPass = new THREE.RenderPass(scene, camera)
    renderPass.renderToScreen = true
    composer.addPass(renderPass)

    composer.setSize(width, height)

    composer.render()

    checkPixels()
    t.end()
  })

  t.test('RenderPass + CopyShaderPass', function (t) {
    var composer = new THREE.EffectComposer(renderer)

    var renderPass = new THREE.RenderPass(scene, camera)
    renderPass.renderToScreen = false
    composer.addPass(renderPass)

    var copyPass = new THREE.ShaderPass(THREE.CopyShader)
    copyPass.renderToScreen = true
    composer.addPass(copyPass)

    composer.setSize(width, height)

    composer.render()

    checkPixels()
    t.end()
  })

  t.end()
})
