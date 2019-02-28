'use strict'

const getPubSub = require('../../shared/pubsub')

// Closes the pubsub connection
// const closePubsub = () => pub.quit()

function createPub (config) {
  // Create a pubsub connection
  const pubsub = getPubSub(config.pubsub === 'redis' && config.redis.url)

  return pubsub
}

module.exports = createPub
