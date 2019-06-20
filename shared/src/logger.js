'use strict'

const config = require('config')
const createLogger = require('@bloq/service-logger')

const logger = createLogger(config.logger)

module.exports = logger
