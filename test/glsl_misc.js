const BLOCKLIST = []

require('./util/conformance')(function (str) {
  return str.indexOf('glsl_misc') === 0 && BLOCKLIST.indexOf(str) < 0
})
