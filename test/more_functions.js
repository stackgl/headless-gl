const BLACKLIST = {
  more_functions_isTests: true,
  more_functions_texSubImage2DHTMLBadArgs: true,
  more_functions_texImage2DHTMLBadArgs: true,
  more_functions_copyTexSubImage2D: true,
  more_functions_texSubImage2DBadArgs: true
}

require('./util/conformance')(function (str) {
  return str.indexOf('more_functions') === 0 && !BLACKLIST[str]
})
