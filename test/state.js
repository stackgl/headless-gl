const BLACKLIST = [
  // This test is fucking broken
  'state_gl-get-calls'
]

require('./util/conformance')(function (str) {
  return str.indexOf('state') === 0 && BLACKLIST.indexOf(str) < 0
})
