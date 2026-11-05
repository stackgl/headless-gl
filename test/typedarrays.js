const BLOCKLIST = []

require('./util/conformance')(function (str) {
  return str.indexOf('typedarrays') === 0 && BLOCKLIST.indexOf(str) < 0
})
