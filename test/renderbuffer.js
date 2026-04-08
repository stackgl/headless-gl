const BLACKLIST = [
  'renderbuffers_feedback-loop',
  'renderbuffers_renderbuffer-initialization'
]

require('./util/conformance')(function (str) {
  return str.indexOf('renderbuffer') === 0 && BLACKLIST.indexOf(str) < 0
})
