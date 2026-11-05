const BLOCKLIST = []

require('./util/conformance')(function (str) {
  return str.indexOf('ogles') === 0 && BLOCKLIST.indexOf(str) < 0
})
