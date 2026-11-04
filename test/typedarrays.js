const BLACKLIST = []

require('./util/conformance')(function (str) {
  return str.indexOf('typedarrays') === 0 && BLACKLIST.indexOf(str) < 0
})
