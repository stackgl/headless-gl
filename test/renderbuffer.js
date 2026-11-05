const BLOCKLIST = []

require('./util/conformance')(function (str) {
  return str.indexOf('renderbuffer') === 0 && BLOCKLIST.indexOf(str) < 0
})
