'use strict'

const config = require('config')

if (config.newRelic && config.newRelic.licenseKey) {
  require('newrelic')
}

const service = require('./service')

service.start()
