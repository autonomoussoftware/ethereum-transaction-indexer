'use strict'

const { redisUrl } = require('config')
const redis = require('redis')
const util = require('util')

const logger = require('./logger')

const client = redis.createClient({ url: redisUrl })

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
const keys = util.promisify(client.keys.bind(client))

// pubsub
function pubsub () {
  const pubsubClient = client.duplicate()

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
