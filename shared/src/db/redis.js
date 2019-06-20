'use strict'

const beforeExit = require('before-exit')
const redis = require('redis')
const util = require('util')

const logger = require('../logger')

function createClient ({ url }, maxBlocks, exposeClient) {
  // Create client
  const client = redis.createClient({ url, return_buffers: false })

  // Handle errors
  client.on('error', function (err) {
    logger.error('Redis error', err)

    const meta = { inner: err, exitCode: 1 }
    const error = Object.assign(new Error('Redis error'), meta)
    beforeExit.do(() => Promise.reject(error))

    // Can't continue if there is a database error
    process.kill(process.pid, 'SIGINT')
  })

  // Promisify client API
  const methods = [
    'get',
    'set',
    'sadd',
    'smembers',
    'zadd',
    'zrangebyscore',
    'zrem',
    'del',
    'expire',
    'quit'
  ]
  const asyncClient = methods.reduce(function (ac, name) {
    ac[name] = util.promisify(client[name].bind(client))
    return ac
  }, {})

  // Create and return the indexer API object
  const api = {
    setBestBlock: data =>
      asyncClient.set('best-block', JSON.stringify(data)),

    getBestBlock: () =>
      asyncClient.get('best-block')
        .then(data => data ? JSON.parse(data) : null),

    setBlockAddress: ({ number, addr }) =>
      asyncClient.sadd(`blk:${number}:eth`, addr)
        .then(() =>
          asyncClient.expire(`blk:${number}:eth`, maxBlocks)
        ),

    getBlockAddresses: ({ number }) =>
      asyncClient.smembers(`blk:${number}:eth`),

    deleteBlockAddresses: ({ number }) =>
      asyncClient.del(`blk:${number}:eth`),

    setAddressTransaction: ({ addr, number, txid }) =>
      asyncClient.zadd(`eth:${addr}`, number, txid),

    getAddressTransactions: ({ addr, min, max }) =>
      asyncClient.zrangebyscore(`eth:${addr}`, min, max),

    deleteAddressTransaction: ({ addr, txid }) =>
      asyncClient.zrem(`eth:${addr}`, txid),

    disconnect: () => asyncClient.quit()
  }

  if (exposeClient) {
    api.client = client
  }

  return Promise.resolve(api)
}

module.exports = createClient
