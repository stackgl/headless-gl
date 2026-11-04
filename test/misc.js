const BLACKLIST = []

require('./util/conformance')(function (str) {
  return str.indexOf('misc') === 0 && BLACKLIST.indexOf(str) < 0
})
