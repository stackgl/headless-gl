const BLACKLIST = []

require('./util/conformance')(function (str) {
  return str.indexOf('state') === 0 && BLACKLIST.indexOf(str) < 0
})
