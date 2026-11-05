const BLOCKLIST = [
  'context_context-type-test'
]

require('./util/conformance')(function (str) {
  return str.indexOf('context') === 0 && BLOCKLIST.indexOf(str) < 0
})
