const BLOCKLIST = []

require('./util/conformance')(function (str) {
  return str.indexOf('more_conformance') === 0 && BLOCKLIST.indexOf(str) < 0
})
