const BLACKLIST = [
  'glsl_samplers_glsl-function-texture2dprojlod'
]

require('./util/conformance')(function (str) {
  return str.indexOf('glsl_samplers') === 0 && BLACKLIST.indexOf(str) < 0
})
