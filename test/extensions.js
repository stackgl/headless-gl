const BLOCKLIST = []

require('./util/conformance')(function (str) {
  return str.indexOf('extensions') >= 0 && BLOCKLIST.indexOf(str) < 0
})
