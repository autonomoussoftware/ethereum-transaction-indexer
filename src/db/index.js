'use strict'

const { maxReorgWindow, mongo: { url, dbName } } = require('config')

const createClient = require('./mongo')

function init () {
  // Keep record of blocks only within the reorg window. Blocks are mined in
  // average every 15 seconds.
  return createClient(url, dbName, maxReorgWindow / 15)
}

module.exports = {
  init
}
