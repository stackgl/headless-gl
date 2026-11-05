const BLOCKLIST = []

require('./util/conformance')(function (str) {
  return str.indexOf('misc') === 0 && BLOCKLIST.indexOf(str) < 0
})
