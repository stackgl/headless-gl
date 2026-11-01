'use strict'

const tape = require('tape')
const createContext = require('../index')

tape('create context', function (t) {
  const width = 10
  const height = 10
  createContext(width, height)
  t.end()
})

tape('create context with an invalid size', function (t) {
  t.throws(() => createContext(0, 10), RangeError)
  t.throws(() => createContext(10, -1), RangeError)
  t.throws(() => createContext(NaN, 10), RangeError)
  t.end()
})
