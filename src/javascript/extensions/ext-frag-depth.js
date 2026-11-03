class EXTFragDepth {}

function getEXTFragDepth (context) {
  let result = null
  const exts = context.getSupportedExtensions()

  if (exts && exts.indexOf('EXT_frag_depth') >= 0) {
    result = new EXTFragDepth()
  }

  return result
}

module.exports = { getEXTFragDepth, EXTFragDepth }
