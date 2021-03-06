'use strict'

const getPubSub = require('../../shared/src/pubsub')

function createPub (config) {
  // Create a pubsub connection
  const pubsub = getPubSub(config.redis.url)

  return pubsub
}

module.exports = createPub
