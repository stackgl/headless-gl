'use strict'

const tape = require('tape')
const createContext = require('../index')

tape('create context', function (t) {
  const width = 10
  const height = 10
  createContext(width, height)
  t.end()
})
