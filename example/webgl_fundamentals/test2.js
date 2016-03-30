var path = require('path');
var createContext = require('../../index');
var utils = require('../common/utils.js');
var utils_log = require('../common/utils_log.js');
var log = new utils_log.Log(path.basename(__filename), "DEBUG");

function main() {
    // Create context
    var width = 512
    var height = 512
    var gl = createContext(width, height)

    var vertex_src = `
        precision mediump float;
        attribute vec2 a_position;

        uniform vec2 u_resolution;

        void main() {
            // convert the rectangle from pixels to 0.0 to 1.0
            vec2 zeroToOne = a_position / u_resolution;

            // convert from 0->1 to 0->2
            vec2 zeroToTwo = zeroToOne * 2.0;

            // convert from 0->2 to -1->+1 (clipspace)
            vec2 clipSpace = zeroToTwo - 1.0;

            gl_Position = vec4(clipSpace, 0, 1);
        }
    `;

    var fragment_src = `
        precision mediump float;
        uniform vec4 u_color;

        void main() {
            gl_FragColor = u_color;
        }
    `;

    // setup a GLSL program
    var program = utils.createProgramFromSources(gl, [vertex_src, fragment_src]);
    gl.useProgram(program);

    // look up where the vertex data needs to go.
    var positionLocation = gl.getAttribLocation(program, "a_position");

    // set the resolution
    var colorLocation = gl.getUniformLocation(program, "u_color");
    var resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    gl.uniform2f(resolutionLocation, width, height);

    // Create a buffer
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // draw 50 random rectangles in random colors
    for (var ii = 0; ii < 50; ++ii) {
        // Setup a random rectangle
        utils.setRectangle(
            gl,
            utils.randomInt(300),
            utils.randomInt(300),
            utils.randomInt(300),
            utils.randomInt(300)
        );

        // Set a random color.
        gl.uniform4f(colorLocation, Math.random(), Math.random(), Math.random(), 1);

        // Draw the rectangle.
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    var filename = __filename + ".ppm";
    log.info(__line, "rendering " + filename);
    utils.bufferToFile(gl, width, height, filename);
    log.info(__line, "finished rendering " + filename);

    gl.destroy();
}

main();