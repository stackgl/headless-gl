// A Node project without the DOM types, importing gl as an ES module.
import createGL, { WebGLRenderingContext, WebGL2RenderingContext } from 'gl'
import type { GLenum, WebGLTexture } from 'gl'

const gl = createGL(1, 1)
gl.clearColor(1, 0, 0, 1)
const texture: WebGLTexture | null = gl.createTexture()
const target: GLenum = gl.TEXTURE_2D
gl.bindTexture(target, texture)
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, { width: 1, height: 1, data: new Uint8Array(4) })
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
gl.getExtension('STACKGL_resize_drawingbuffer').resize(2, 2)
const mirrorClamp: number | undefined = gl.getExtension('EXT_texture_mirror_clamp_to_edge')?.MIRROR_CLAMP_TO_EDGE_EXT
// @ts-expect-error getExtension returns null for unsupported extensions, including those the DOM types don't declare.
gl.getExtension('EXT_texture_mirror_clamp_to_edge').MIRROR_CLAMP_TO_EDGE_EXT

// @ts-expect-error headless-gl contexts have no canvas.
gl.canvas
// @ts-expect-error WebGL1 contexts have no WebGL2 methods.
gl.createVertexArray()

const gl2 = createGL(1, 1, { createWebGL2Context: true, alpha: false })
gl2.bindVertexArray(gl2.createVertexArray())
const texture3D: number = WebGL2RenderingContext.TEXTURE_3D
const textureCube: number = WebGLRenderingContext.TEXTURE_CUBE_MAP
// @ts-expect-error The classes have the constants but not the methods.
WebGLRenderingContext.clearColor(1, 0, 0, 1)

const unknownContext: unknown = gl2
if (unknownContext instanceof WebGL2RenderingContext) {
  unknownContext.texStorage3D(texture3D, 1, unknownContext.RGBA8, 1, 1, 1)
}

// @ts-expect-error The DOM types aren't part of the project.
document.title

gl.getExtension('STACKGL_destroy_context').destroy()
gl2.getExtension('STACKGL_destroy_context').destroy()

export { textureCube, mirrorClamp }
