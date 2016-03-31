var BLACKLIST = [
  // FIXME: These extensions aren't working yet
  'extensions_ext-frag-depth',
  'extensions_ext-shader-texture-lod',
  'extensions_oes-standard-derivatives',
  'extensions_webgl-draw-buffers'
]

require('./util/conformance')(function (str) {
  return str.indexOf('extensions') >= 0 && BLACKLIST.indexOf(str) < 0
})
