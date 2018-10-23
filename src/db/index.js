'use strict'

const { mapValues } = require('lodash')
const { maxReorgWindow, mongo: { url, dbName } } = require('config')

const createClient = require('./mongo')
const logger = require('../logger')

// Keep record of blocks only within the reorg window. Blocks are mined in
// average every 15 seconds.
const client = createClient(url, dbName, maxReorgWindow / 15)

// Wrap all Mongo calls to queue them until the client is initialized
const queueMongoCall = method =>
  (...args) => client
    .then(api => api.db[method](...args))
    .catch(function (err) {
      logger.error(`Database error: ${err.toString()}`)
      process.exit(1)
    })

// Mapping between indexer DB API and Mongo indexer API
const apiMethods = {
  getBestBlock: 'findBestBlock',
  setBestBlock: 'insertBestBlock',
  deleteBlockAddresses: 'deleteBlock',
  getBlockAddresses: 'findBlockAddresses',
  setBlockAddress: 'upsertBlock',
  deleteAddressTransaction: 'deleteAddressTransaction',
  getAddressTransactions: 'findAddressTransactions',
  setAddressTransaction: 'upsertAddress'
}

const api = mapValues(apiMethods, queueMongoCall)

module.exports = api
