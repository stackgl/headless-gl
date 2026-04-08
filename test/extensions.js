const BLACKLIST = [
  // FIXME: These extensions aren't working yet
  'extensions_webgl-draw-buffers'
]

require('./util/conformance')(function (str) {
  return str.indexOf('extensions') >= 0 && BLACKLIST.indexOf(str) < 0
})
