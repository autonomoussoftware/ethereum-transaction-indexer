'use strict'

const { redis: { url, scanCount: count } } = require('config')
const redis = require('redis')
const util = require('util')
const pDefer = require('p-defer')

const logger = require('./logger')

const client = redis.createClient({
  url,
  return_buffers: true
})

client.on('error', function (err) {
  logger.error('Redis error', err)
})

// string keys
const get = util.promisify(client.get.bind(client))
const set = util.promisify(client.set.bind(client))

// sets
const sadd = util.promisify(client.sadd.bind(client))
const smembers = util.promisify(client.smembers.bind(client))

// sorted sets
const zadd = util.promisify(client.zadd.bind(client))
const zrangebyscore = util.promisify(client.zrangebyscore.bind(client))
const zrem = util.promisify(client.zrem.bind(client))
const zremrangebyscore = util.promisify(client.zremrangebyscore.bind(client))

// utils
const del = util.promisify(client.del.bind(client))
const expire = util.promisify(client.expire.bind(client))

// KEYS implemented with SCAN
function keys (pattern) {
  logger.debug('Scanning for keys pattern', pattern)

  let cursor = '0'
  const keysFound = []

  const deferred = pDefer()

  function scan () {
    client.scan(cursor, 'MATCH', pattern, 'COUNT', count, function (err, res) {
      if (err) {
        deferred.reject(err)
        return
      }

      cursor = res[0].toString()
      const keysBatch = res[1]

      if (keysBatch.length) {
        logger.debug('Matching keys found', keysBatch.length)

        keysFound.push(...keysBatch.map(b => b.toString()))
      }

      if (cursor === '0') {
        logger.debug('Scan completed')

        deferred.resolve(keysFound)
        return
      }

      scan()
    })
  }

  scan()

  return deferred.promise
}

// pubsub
function pubsub () {
  const pubsubClient = client.duplicate({ return_buffers: false })

  pubsubClient.on('error', function (err) {
    logger.error('Redis error on pubsub', err)
  })

  return {
    on: pubsubClient.on.bind(pubsubClient),
    psubscribe: util.promisify(pubsubClient.psubscribe.bind(pubsubClient)),
    publish: util.promisify(pubsubClient.publish.bind(pubsubClient)),
    quit: util.promisify(pubsubClient.quit.bind(pubsubClient))
  }
}

module.exports = {
  del,
  expire,
  get,
  keys,
  pubsub,
  sadd,
  set,
  smembers,
  zadd,
  zrangebyscore,
  zrem,
  zremrangebyscore
}
