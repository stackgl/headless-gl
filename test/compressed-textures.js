'use strict'

const tape = require('tape')
const createContext = require('../index')

const COMPRESSED_RGB_S3TC_DXT1_EXT = 0x83F0

for (const webgl2 of [false, true]) {
  tape(`compressed textures: WebGL${webgl2 ? 2 : 1} without a compressed texture extension`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())

    const formats = gl.getParameter(gl.COMPRESSED_TEXTURE_FORMATS)
    t.ok(formats instanceof Uint32Array, 'COMPRESSED_TEXTURE_FORMATS is a Uint32Array')
    t.equal(formats.length, 0, 'with no formats')

    gl.compressedTexImage2D(gl.TEXTURE_2D, 0, COMPRESSED_RGB_S3TC_DXT1_EXT, 4, 4, 0, new Uint8Array(8))
    t.equal(gl.getError(), gl.INVALID_ENUM, 'compressedTexImage2D sets INVALID_ENUM for a format that isn\'t enabled')
    gl.compressedTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 4, 4, COMPRESSED_RGB_S3TC_DXT1_EXT, new Uint8Array(8))
    t.notEqual(gl.getError(), gl.NO_ERROR, 'and compressedTexSubImage2D sets an error')

    t.throws(() => gl.compressedTexImage2D(gl.TEXTURE_2D, 0, COMPRESSED_RGB_S3TC_DXT1_EXT, 4, 4, 0, null), TypeError, 'compressedTexImage2D throws a TypeError without data')
    t.throws(() => gl.compressedTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 4, 4, COMPRESSED_RGB_S3TC_DXT1_EXT, [0]), TypeError, 'and compressedTexSubImage2D for an array')

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}
