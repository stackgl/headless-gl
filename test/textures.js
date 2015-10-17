var BLACKLIST = [
  'textures_compressed-tex-image',
  'textures_copy-tex-image-2d-formats',
  'textures_copy-tex-image-and-sub-image-2d',
  'textures_tex-image-webgl',
  'textures_tex-image-and-uniform-binding-bugs'
]

require('./util/conformance')(function(str) {
  return str.indexOf('textures') === 0 && BLACKLIST.indexOf(str) < 0
})
