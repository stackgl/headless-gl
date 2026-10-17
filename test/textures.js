const BLACKLIST = [
  'textures_compressed-tex-image',
  'textures_tex-image-webgl',

  // Broken.  Formats besides gl.RGBA don't work for fbos
  'textures_texture-attachment-formats',
  'textures_texture-fakeblack'
]

require('./util/conformance')(function (str) {
  return str.indexOf('textures') === 0 && BLACKLIST.indexOf(str) < 0
})
