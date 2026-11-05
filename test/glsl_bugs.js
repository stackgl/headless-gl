const BLOCKLIST = []

require('./util/conformance')(function (str) {
  return str.indexOf('glsl_bugs') === 0 && BLOCKLIST.indexOf(str) < 0
})
