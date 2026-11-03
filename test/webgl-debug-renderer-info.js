'use strict'

const tape = require('tape')
const createContext = require('../index')

const UNMASKED_VENDOR_WEBGL = 0x9245
const UNMASKED_RENDERER_WEBGL = 0x9246

for (const webgl2 of [false, true]) {
  tape(`WEBGL_debug_renderer_info: WebGL${webgl2 ? 2 : 1}`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })

    t.equal(gl.getParameter(UNMASKED_RENDERER_WEBGL), null, 'getParameter returns null before the extension is enabled')
    t.equal(gl.getError(), gl.INVALID_ENUM, 'and sets INVALID_ENUM')

    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    t.ok(ext, 'available')
    t.equal(ext.UNMASKED_VENDOR_WEBGL, UNMASKED_VENDOR_WEBGL, 'UNMASKED_VENDOR_WEBGL')
    t.equal(ext.UNMASKED_RENDERER_WEBGL, UNMASKED_RENDERER_WEBGL, 'UNMASKED_RENDERER_WEBGL')

    const vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
    t.ok(typeof vendor === 'string' && vendor.length > 0, `UNMASKED_VENDOR_WEBGL is ANGLE's vendor: ${vendor}`)
    t.ok(typeof renderer === 'string' && renderer.startsWith('ANGLE ('), `UNMASKED_RENDERER_WEBGL is ANGLE's renderer: ${renderer}`)
    t.equal(gl.getParameter(gl.RENDERER), 'ANGLE', 'RENDERER is unchanged')
    t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}
