const BLOCKLIST = []

require('./util/conformance')(function (str) {
  return str.indexOf('textures') === 0 && BLOCKLIST.indexOf(str) < 0
})
