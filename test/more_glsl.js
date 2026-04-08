const BLACKLIST = [
  'more_glsl_arrayOutOfBounds'
]

require('./util/conformance')(function (str) {
  return str.indexOf('more_glsl') === 0 && BLACKLIST.indexOf(str) < 0
})
