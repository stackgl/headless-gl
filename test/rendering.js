const BLACKLIST = []

// This test failed on ANGLE's Direct3D backend, which Windows uses.
if (process.platform === 'win32') {
  BLACKLIST.push('rendering_point-no-attributes')
}

require('./util/conformance')(function (str) {
  return str.indexOf('rendering') === 0 && BLACKLIST.indexOf(str) < 0
})
