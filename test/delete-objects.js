'use strict'

const tape = require('tape')
const createContext = require('../index')

const WEBGL1_METHODS = ['deleteBuffer', 'deleteFramebuffer', 'deleteProgram', 'deleteRenderbuffer', 'deleteShader', 'deleteTexture']
const WEBGL2_METHODS = [...WEBGL1_METHODS, 'deleteQuery', 'deleteSampler', 'deleteSync', 'deleteTransformFeedback', 'deleteVertexArray']

for (const webgl2 of [false, true]) {
  tape(`delete objects: WebGL${webgl2 ? 2 : 1} delete methods do nothing for null`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })

    const methods = (webgl2 ? WEBGL2_METHODS : WEBGL1_METHODS).map(name => [name, gl[name].bind(gl)])
    if (!webgl2) {
      const ext = gl.getExtension('OES_vertex_array_object')
      methods.push(['deleteVertexArrayOES', ext.deleteVertexArrayOES.bind(ext)])
    }
    for (const [name, method] of methods) {
      method(null)
      t.equal(gl.getError(), gl.NO_ERROR, `${name}(null) sets no error`)
      method(undefined)
      t.equal(gl.getError(), gl.NO_ERROR, `${name}(undefined) sets no error`)
    }

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}

tape('delete objects: deleteTexture unbinds 3D and 2D array textures from every texture unit', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  const texture3D = gl.createTexture()
  const texture2DArray = gl.createTexture()
  gl.activeTexture(gl.TEXTURE2)
  gl.bindTexture(gl.TEXTURE_3D, texture3D)
  gl.activeTexture(gl.TEXTURE3)
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture2DArray)
  gl.activeTexture(gl.TEXTURE1)

  gl.deleteTexture(texture3D)
  gl.deleteTexture(texture2DArray)
  t.equal(gl.getError(), gl.NO_ERROR, 'deleting them sets no error')
  t.equal(gl.getParameter(gl.ACTIVE_TEXTURE), gl.TEXTURE1, 'and leaves the active texture unit')
  gl.activeTexture(gl.TEXTURE2)
  t.equal(gl.getParameter(gl.TEXTURE_BINDING_3D), null, 'the 3D texture is unbound from its unit')
  gl.activeTexture(gl.TEXTURE3)
  t.equal(gl.getParameter(gl.TEXTURE_BINDING_2D_ARRAY), null, 'and the 2D array texture from its unit')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

for (const webgl2 of [false, true]) {
  tape(`delete objects: WebGL${webgl2 ? 2 : 1} framebuffers that aren't bound keep deleted attachments`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })

    const kinds = {
      renderbuffer: {
        type: gl.RENDERBUFFER,
        create () {
          const renderbuffer = gl.createRenderbuffer()
          gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer)
          gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA4, 1, 1)
          return renderbuffer
        },
        attach (renderbuffer) {
          gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, renderbuffer)
        },
        delete: renderbuffer => gl.deleteRenderbuffer(renderbuffer)
      },
      texture: {
        type: gl.TEXTURE,
        create () {
          const texture = gl.createTexture()
          gl.bindTexture(gl.TEXTURE_2D, texture)
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
          return texture
        },
        attach (texture) {
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
        },
        delete: texture => gl.deleteTexture(texture)
      }
    }

    for (const [name, kind] of Object.entries(kinds)) {
      const object = kind.create()
      const other = gl.createFramebuffer()
      const bound = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, other)
      kind.attach(object)
      gl.bindFramebuffer(gl.FRAMEBUFFER, bound)
      kind.attach(object)

      kind.delete(object)
      t.equal(gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE), gl.NONE, `deleting a ${name} detaches it from the bound framebuffer`)
      // ANGLE gives the new object the deleted one's id.
      const replacement = kind.create()
      gl.bindFramebuffer(gl.FRAMEBUFFER, other)
      t.equal(gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE), kind.type, 'but not from the other framebuffer')
      t.equal(gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME), object, `whose FRAMEBUFFER_ATTACHMENT_OBJECT_NAME is still the deleted ${name}`)
      t.notEqual(gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME), replacement, `rather than a new ${name} with its id`)
      t.equal(gl.getError(), gl.NO_ERROR, 'no GL errors')
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}

tape('delete objects: WebGL2 FRAMEBUFFER_ATTACHMENT_OBJECT_NAME is null without an attachment', function (t) {
  const gl = createContext(1, 1, { createWebGL2Context: true })

  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer())
  t.equal(gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME), null, 'getFramebufferAttachmentParameter returns null')
  t.equal(gl.getError(), gl.NO_ERROR, 'without an error')

  gl.getExtension('STACKGL_destroy_context').destroy()
  t.end()
})

for (const webgl2 of [false, true]) {
  tape(`delete objects: WebGL${webgl2 ? 2 : 1} binding a deleted object sets INVALID_OPERATION`, function (t) {
    const gl = createContext(1, 1, { createWebGL2Context: webgl2 })

    // Each bind function, with how to make, delete and bind its objects, and read its binding.
    const binds = [
      ['bindBuffer', () => gl.createBuffer(), buffer => gl.deleteBuffer(buffer), buffer => gl.bindBuffer(gl.ARRAY_BUFFER, buffer), () => gl.getParameter(gl.ARRAY_BUFFER_BINDING)],
      ['bindFramebuffer', () => gl.createFramebuffer(), framebuffer => gl.deleteFramebuffer(framebuffer), framebuffer => gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer), () => gl.getParameter(gl.FRAMEBUFFER_BINDING)],
      ['bindRenderbuffer', () => gl.createRenderbuffer(), renderbuffer => gl.deleteRenderbuffer(renderbuffer), renderbuffer => gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer), () => gl.getParameter(gl.RENDERBUFFER_BINDING)],
      ['bindTexture', () => gl.createTexture(), texture => gl.deleteTexture(texture), texture => gl.bindTexture(gl.TEXTURE_2D, texture), () => gl.getParameter(gl.TEXTURE_BINDING_2D)]
    ]
    if (webgl2) {
      binds.push(
        ['bindBufferBase', () => gl.createBuffer(), buffer => gl.deleteBuffer(buffer), buffer => gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, buffer), () => gl.getIndexedParameter(gl.UNIFORM_BUFFER_BINDING, 0)],
        ['bindBufferRange', () => gl.createBuffer(), buffer => gl.deleteBuffer(buffer), buffer => gl.bindBufferRange(gl.UNIFORM_BUFFER, 1, buffer, 0, 16), () => gl.getIndexedParameter(gl.UNIFORM_BUFFER_BINDING, 1)])
    }
    for (const [name, create, remove, bind, binding] of binds) {
      const bound = create()
      bind(bound)
      const deleted = create()
      remove(deleted)
      bind(deleted)
      t.equal(gl.getError(), gl.INVALID_OPERATION, `${name} sets INVALID_OPERATION for a deleted object`)
      t.equal(binding(), bound, 'and leaves the binding')
    }

    gl.getExtension('STACKGL_destroy_context').destroy()
    t.end()
  })
}
