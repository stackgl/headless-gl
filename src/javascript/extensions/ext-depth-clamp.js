class EXTDepthClamp {
  constructor () {
    this.DEPTH_CLAMP_EXT = 0x864F
  }
}

function getEXTDepthClamp (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('EXT_depth_clamp') >= 0) {
    result = new EXTDepthClamp()
  }

  return result
}

module.exports = { getEXTDepthClamp, EXTDepthClamp }
