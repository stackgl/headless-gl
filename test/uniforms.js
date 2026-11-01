const BLACKLIST = [
  // This test is really fiddly.  It relies on some weird antialiasing behavior
  // for GL_LINES
  'uniforms_out-of-bounds-uniform-array-access'
]

// GitHub's macOS runners are virtual machines with a paravirtualized GPU, where a samplerCube lookup in the vertex shader doesn't return the texel this test expects. The test samples with the degenerate direction vec3(0, 0, 0), and it passes on real Macs.
if (process.platform === 'darwin' && process.env.GITHUB_ACTIONS === 'true') {
  BLACKLIST.push('uniforms_uniform-default-values')
}

require('./util/conformance')(function (str) {
  return str.indexOf('uniforms') === 0 && BLACKLIST.indexOf(str) < 0
})
