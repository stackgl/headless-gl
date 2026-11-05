const BLOCKLIST = []

// This test failed on ANGLE's Direct3D backend, which Windows uses.
if (process.platform === 'win32') {
  BLOCKLIST.push('rendering_point-no-attributes')
}

require('./util/conformance')(function (str) {
  return str.indexOf('rendering') === 0 && BLOCKLIST.indexOf(str) < 0
})
