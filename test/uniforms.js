const BLOCKLIST = []

// GitHub's macOS runners are virtual machines with a paravirtualized GPU, where a samplerCube lookup in the vertex shader doesn't return the texel this test expects. The test samples with the degenerate direction vec3(0, 0, 0), and it passes on real Macs.
if (process.platform === 'darwin' && process.env.GITHUB_ACTIONS === 'true') {
  BLOCKLIST.push('uniforms_uniform-default-values')
}

require('./util/conformance')(function (str) {
  return str.indexOf('uniforms') === 0 && BLOCKLIST.indexOf(str) < 0
})
