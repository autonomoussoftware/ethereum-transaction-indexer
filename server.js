'use strict'

const config = require('config')

if (config.newRelic.licenseKey) {
  require('newrelic')
}

const indexer = require('./src/indexer')
const api = require('./src/api')

api.start()
indexer.start()
