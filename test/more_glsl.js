const BLOCKLIST = []

require('./util/conformance')(function (str) {
  return str.indexOf('more_glsl') === 0 && BLOCKLIST.indexOf(str) < 0
})
