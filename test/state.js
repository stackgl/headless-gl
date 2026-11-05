const BLOCKLIST = []

require('./util/conformance')(function (str) {
  return str.indexOf('state') === 0 && BLOCKLIST.indexOf(str) < 0
})
