var BLACKLIST = [
  // This test is really fiddly.  It relies on some weird antialiasing behavior
  // for GL_LINES
  'uniforms_out-of-bounds-uniform-array-access'
]

require('./util/conformance')(function (str) {
  return str.indexOf('uniforms') === 0 && BLACKLIST.indexOf(str) < 0
})
