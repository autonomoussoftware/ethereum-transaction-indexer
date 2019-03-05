'use strict'

const redis = require('redis')
const util = require('util')

const logger = require('./logger')

// Create and return a Redis Pub-Sub client
function createRedisPubSub (url) {
  const client = redis.createClient(url)

  client.on('error', function (err) {
    logger.error('Redis pubsub error', err)
  })

  return {
    on: client.on.bind(client),
    psubscribe: util.promisify(client.psubscribe.bind(client)),
    publish: util.promisify(client.publish.bind(client)),
    quit: util.promisify(client.quit.bind(client))
  }
}

module.exports = createRedisPubSub
