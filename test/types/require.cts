// A Node project without the DOM types, requiring gl as a CommonJS module.
import createGL = require('gl')

const gl = createGL(1, 1, { createWebGL2Context: true })
const isWebGL2: boolean = gl instanceof createGL.WebGL2RenderingContext
const context: createGL.WebGL2RenderingContext = gl
context.getExtension('STACKGL_destroy_context').destroy()

export { isWebGL2 }
