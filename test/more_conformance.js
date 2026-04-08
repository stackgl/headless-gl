const BLACKLIST = []

require('./util/conformance')(function (str) {
  return str.indexOf('more_conformance') === 0 && BLACKLIST.indexOf(str) < 0
})
