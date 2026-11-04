const BLACKLIST = []

require('./util/conformance')(function (str) {
  return str.indexOf('glsl_bugs') === 0 && BLACKLIST.indexOf(str) < 0
})
