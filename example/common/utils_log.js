/* globals  __stack */

var log4js = require('log4js')
// var path = require('path')

function getLogger (category, level) {
  var log
  if (level == null) {
    level = 'INFO'
  }

  log4js.configure({
    appenders: [
      {
        type: 'console'
      }
    ]
  })

  log = log4js.getLogger(category)
  log.setLevel(level)
  return log
}

function Log (filename, level) {
  this.log = getLogger('', level)
  this.filename = filename
}

Log.prototype = {
  error: function (line, text) {
    this.log.error('(' + this.filename + ':' + line + ') ' + text)
  },
  info: function (line, text) {
    this.log.info('(' + this.filename + ':' + line + ') ' + text)
  },
  warn: function (line, text) {
    this.log.warn('(' + this.filename + ':' + line + ') ' + text)
  },
  debug: function (line, text) {
    this.log.debug('(' + this.filename + ':' + line + ') ' + text)
  }
}

Object.defineProperty(global, '__stack', {
  get: function () {
    var orig = Error.prepareStackTrace
    Error.prepareStackTrace = function (_, stack) {
      return stack
    }
    var err = new Error()
    Error.captureStackTrace(err, arguments.callee) // eslint-disable-line 
    var stack = err.stack
    Error.prepareStackTrace = orig
    return stack
  }
})

Object.defineProperty(global, '__line', {
  get: function () {
    return __stack[1].getLineNumber()
  }
})

module.exports.Log = Log
