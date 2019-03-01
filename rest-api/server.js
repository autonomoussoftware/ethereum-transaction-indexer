'use strict'

const beforeExit = require('before-exit')
const config = require('config')

const logger = require('../shared/logger')
const service = require('./src')

logger.info('Starting up...')
logger.debug('Startup configuration: %j', config)

service.start(config)
  .catch(function (err) {
    logger.error('Terminating on error: %s', err.message)
    logger.debug(err.stack)
    process.exit(1)
  })

beforeExit.do(function (signal) {
  logger.error('Shutting down on signal %s', signal)
})
