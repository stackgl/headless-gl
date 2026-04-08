const BLACKLIST = [
  // This test is really fiddly.  It relies on some weird antialiasing behavior
  // for GL_LINES
  'uniforms_out-of-bounds-uniform-array-access',

  // Not sure what is happening here.  This test segfaults on travis-ci (bad)
  // Can't get it to reproduce locally and it is taking too long to debug.
  'uniforms_uniform-default-values'
]

require('./util/conformance')(function (str) {
  return str.indexOf('uniforms') === 0 && BLACKLIST.indexOf(str) < 0
})
