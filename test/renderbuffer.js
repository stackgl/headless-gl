var BLACKLIST = [
  'renderbuffers_feedback-loop'
]

require('./util/conformance')(function (str) {
  return str.indexOf('renderbuffer') === 0 && BLACKLIST.indexOf(str) < 0
})
