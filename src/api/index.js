'use strict'

const config = require('config')

const logger = require('../logger')

if (config.newRelic && config.newRelic.licenseKey) {
  require('newrelic')
}

const service = require('./service')

service.start()
  .catch(function (err) {
    logger.error('Failed to run API service', err.message)
    process.exit(1)
  })
