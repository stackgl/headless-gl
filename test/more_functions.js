const BLOCKLIST = {
  more_functions_copyTexSubImage2D: true
}

require('./util/conformance')(function (str) {
  return str.indexOf('more_functions') === 0 && !BLOCKLIST[str]
})
