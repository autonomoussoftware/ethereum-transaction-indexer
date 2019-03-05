'use strict'

const attachSocketIo = require('./src/api')
const attachToDb = require('./src/listener')

const logger = require('../shared/src/logger')

function start (config, httpServer) {
  return attachToDb(config, attachSocketIo(config, httpServer))
    .then(function () {
      logger.info('Events API is up')
    })
}

module.exports = { start }
