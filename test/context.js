const BLACKLIST = [
  'context_context-type-test'
]

require('./util/conformance')(function (str) {
  return str.indexOf('context') === 0 && BLACKLIST.indexOf(str) < 0
})
