/* globals __line */

var path = require('path')
var createContext = require('../../index')
var getPixels = require('get-pixels')

var utils = require('../common/utils.js')
var utils_log = require('../common/utils_log.js')
var log = new utils_log.Log(path.basename(__filename), 'DEBUG')

function main () {
  // Create context
  var width = 512
  var height = 512
  var gl = createContext(width, height)

  gl.setDebugMode(false)

  var vertex_src = `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;

        uniform vec2 u_resolution;

        varying vec2 v_texCoord;

        void main() {
            // convert the rectangle from pixels to 0.0 to 1.0
            vec2 zeroToOne = a_position / u_resolution;

            // convert from 0->1 to 0->2
            vec2 zeroToTwo = zeroToOne * 2.0;

            // convert from 0->2 to -1->+1 (clipspace)
            vec2 clipSpace = zeroToTwo - 1.0;

            gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

            // pass the texCoord to the fragment shader
            // The GPU will interpolate this value between points.
            v_texCoord = a_texCoord;
        }
    `

  var fragment_src = `
        precision mediump float;

        // our texture
        uniform sampler2D u_image;

        // the texCoords passed in from the vertex shader.
        varying vec2 v_texCoord;

        void main() {
            vec2 uv = gl_FragCoord.xy / vec2(512.0,512.0);
            if(uv.x < 0.5) {
                gl_FragColor = texture2D(u_image, v_texCoord);
                // gl_FragColor = vec4(1, 0, 0, 1);
            } else {
                gl_FragColor = vec4(0, 1, 0, 1);
            }
        }
    `

  // setup GLSL program
  var program = utils.createProgramFromSources(gl, [vertex_src, fragment_src])
  gl.useProgram(program)

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, 'a_position')
  var texCoordLocation = gl.getAttribLocation(program, 'a_texCoord')

  // provide texture coordinates for the rectangle.
  var texCoordBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0.0, 0.0,
    1.0, 0.0,
    0.0, 1.0,
    0.0, 1.0,
    1.0, 0.0,
    1.0, 1.0
  ]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(texCoordLocation)
  gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0)

  // Load assets
  getPixels(path.join(__dirname, '..', 'data', 'lena.png'), function (err, image) {
    if (err) {
      log.error(__line, err)
    } else {
      log.info(__line, image.data.length)
      log.info(__line, image.shape[0])
      log.info(__line, image.shape[1])
      log.info(__line, typeof (image.data))
      console.log(Object.keys(image))

      // Create a texture.
      var texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)

      // Set the parameters so we can render any size image.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

      // Upload the image into the texture.
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)

      // lookup uniforms
      var resolutionLocation = gl.getUniformLocation(program, 'u_resolution')

      // set the resolution
      gl.uniform2f(resolutionLocation, width, height)

      // Create a buffer for the position of the rectangle corners.
      var buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(positionLocation)
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

      // Set a rectangle the same size as the image.
      utils.setRectangle(gl, 0, 0, image.shape[0], image.shape[1])

      // Draw the rectangle.
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      var files = [
        utils.replaceExt(__filename, '.jpg')
      ]

      for (var i = 0; i < files.length; i++) {
        var filename = files[i]
        log.info(__line, 'rendering ' + filename)
        utils.bufferToFile(gl, width, height, filename)
        log.info(__line, 'finished rendering ' + filename)
      }

      gl.destroy()
    }
  })
}

main()
