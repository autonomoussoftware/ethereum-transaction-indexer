'use strict'

const createClient = require('./mongo-adapter')
const logger = require('./logger')

const client = createClient()

const queueMongoCall = command =>
  (...args) => client
    .then(api => api.db[command](...args))
    .catch(function (err) {
      logger.error(`Database error: ${err.toString()}`)
      process.exit(1)
    })

const getBestBlock = queueMongoCall('findBestBlock')
const setBestBlock = queueMongoCall('insertBestBlock')

const deleteBlockAddresses = queueMongoCall('deleteBlock')
const setBlockAddress = queueMongoCall('upsertBlock')
const getBlockAddresses = queueMongoCall('findBlockAddresses')

const setAddressTransaction = queueMongoCall('upsertAddress')
const getAddressTransactions = queueMongoCall('findAddressTransactions')
const deleteAddressTransaction = queueMongoCall('deleteAddressTransaction')

module.exports = {
  deleteBlockAddresses,
  getBestBlock,
  setBlockAddress,
  setBestBlock,
  getBlockAddresses,
  setAddressTransaction,
  getAddressTransactions,
  deleteAddressTransaction
}
