'use strict'

const redis = require('redis')
const util = require('util')

const logger = require('../logger')

function createClient (url, maxBlocks) {
  // Create client
  const client = redis.createClient({ url, return_buffers: false })

  // Handle errors
  client.on('error', function (err) {
    logger.error('Redis error', err)

    // Can't continue if there is a database error
    process.exit(1)
  })

  // Promisify client API
  const get = util.promisify(client.get.bind(client))
  const set = util.promisify(client.set.bind(client))
  const sadd = util.promisify(client.sadd.bind(client))
  const smembers = util.promisify(client.smembers.bind(client))
  const zadd = util.promisify(client.zadd.bind(client))
  const zrangebyscore = util.promisify(client.zrangebyscore.bind(client))
  const zrem = util.promisify(client.zrem.bind(client))
  const del = util.promisify(client.del.bind(client))
  const expire = util.promisify(client.expire.bind(client))

  // Create and return the indexer API object
  return Promise.resolve({
    setBestBlock: data => set('best-block', JSON.stringify(data)),
    getBestBlock: () => get('best-block').then(data => data ? JSON.parse(data) : null),
    setBlockAddress: ({ number, addr }) => sadd(`blk:${number}:eth`, addr).then(() => expire(`blk:${number}:eth`, maxBlocks)),
    getBlockAddresses: ({ number }) => smembers(`blk:${number}:eth`),
    deleteBlockAddresses: ({ number }) => del(`blk:${number}:eth`),
    setAddressTransaction: ({ addr, number, txid }) => zadd(`eth:${addr}`, number, txid),
    getAddressTransactions: ({ addr, min, max }) => zrangebyscore(`eth:${addr}`, min, max),
    deleteAddressTransaction: ({ addr, txid }) => zrem(`eth:${addr}`, txid)
  })
}

module.exports = createClient
