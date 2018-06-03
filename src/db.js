'use strict'

const createClient = require('./mongo-adapter')

const client = createClient()

const queueMongoCall = command =>
  (...args) => client.then(api => api.db[command](...args))

const getBestBlock = queueMongoCall('findBestBlock')
const setBestBlock = queueMongoCall('insertBestBlock')

const deleteBlockAddresses = queueMongoCall('deleteBlock')
const setBlockAddress = queueMongoCall('upsertBlock')
const getBlockAddresses = queueMongoCall('findBlockAddresses')

const setAddressTransaction = queueMongoCall('upsertAddress')
const getAddressTransactions = queueMongoCall('findAddressTransactions')
const deleteAddressTransaction = queueMongoCall('deleteAddressTransaction')

const getAddressTokens = queueMongoCall('findAddressTokens')

module.exports = {
  deleteBlockAddresses,
  getBestBlock,
  getAddressTokens,
  setBlockAddress,
  setBestBlock,
  getBlockAddresses,
  setAddressTransaction,
  getAddressTransactions,
  deleteAddressTransaction
}
