'use strict'

const beforeExit = require('before-exit')
const config = require('config')

const events = require('../events')
const logger = require('../shared/src/logger')
const restApi = require('../rest-api/src')

logger.info('Starting up...')
logger.debug('Startup configuration: %j', config)

restApi.start(config, { socketio: true })
  .then(server => events.start(config, server))
  .catch(function (err) {
    logger.error('Terminating on error: %s', err.message)
    logger.debug(err.stack)
    process.exit(1)
  })

beforeExit.do(function (signal) {
  logger.error('Shutting down on signal %s', signal)
})
