'use strict'

const { redis: { url } } = require('config')
const redis = require('redis')
const util = require('util')

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
  pubsub,
  sadd,
  set,
  smembers,
  zadd,
  zrangebyscore,
  zrem,
  zremrangebyscore
}
