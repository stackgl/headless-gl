const BLACKLIST = [
  'textures_compressed-tex-image'
]

require('./util/conformance')(function (str) {
  return str.indexOf('textures') === 0 && BLACKLIST.indexOf(str) < 0
})
