const BLACKLIST = [
  'textures_compressed-tex-image',
  'textures_copy-tex-image-2d-formats',
  'textures_copy-tex-image-and-sub-image-2d',
  'textures_tex-image-webgl',
  'textures_tex-image-and-uniform-binding-bugs',

  // FIXME: This test is broken
  'textures_tex-input-validation',

  // Broken.  Formats besides gl.RGBA don't work for fbos
  'textures_texture-attachment-formats',
  'textures_texture-fakeblack',

  // Don't have a mechanism to detect feedback yet
  'textures_texture-copying-feedback-loops',

  // Not sure what's happening here
  'textures_texture-mips'
]

require('./util/conformance')(function (str) {
  return str.indexOf('textures') === 0 && BLACKLIST.indexOf(str) < 0
})
