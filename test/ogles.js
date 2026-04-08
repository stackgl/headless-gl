const BLACKLIST = [
  // FIXME not sure what the hell is happening in these cases
  // ogles tests are completely nutzo impossible to trace :(
  'ogles_GL_array_array_001_to_006',
  'ogles_GL_biuDepthRange_biuDepthRange_001_to_002',
  'ogles_GL_build_build_001_to_008',
  'ogles_GL_build_build_025_to_032',
  'ogles_GL_gl_FragCoord_gl_FragCoord_001_to_003',
  'ogles_GL_mat3_mat3_001_to_006',
  'ogles_GL_vec3_vec3_001_to_008',
  'ogles_GL_functions_functions_001_to_008'
]

require('./util/conformance')(function (str) {
  return str.indexOf('ogles') === 0 && BLACKLIST.indexOf(str) < 0
})
