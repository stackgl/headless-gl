const BLACKLIST = []

require('./util/conformance')(function (str) {
  return str.indexOf('ogles') === 0 && BLACKLIST.indexOf(str) < 0
})
