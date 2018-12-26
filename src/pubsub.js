'use strict'

const EventEmitter = require('events')
const redis = require('redis')
const util = require('util')

const logger = require('./logger')

// Create and return a Redis Pub-Sub client
function createRedisPubSub (url) {
  const client = redis.createClient(url)

  client.on('error', function (err) {
    logger.error('Redis error on pubsub', err)
  })

  return {
    on: client.on.bind(client),
    psubscribe: util.promisify(client.psubscribe.bind(client)),
    publish: util.promisify(client.publish.bind(client)),
    quit: util.promisify(client.quit.bind(client))
  }
}

// In-process event emitter
let emitter

// Create and return an in-process pubsub client that replicates Redis API
function getInProcessPubSub () {
  emitter = emitter || new EventEmitter()

  const patterns = []

  return {
    on (event, handler) {
      if (event === 'pmessage') {
        emitter.on('event', function (channel, message) {
          patterns.forEach(function ({ pattern, regex }) {
            if (regex.test(channel)) {
              handler(pattern, channel, message)
            }
          })
        })
      }
    },
    psubscribe (pattern) {
      patterns.push({ pattern, regex: new RegExp(pattern.replace('*', '.*')) })
      return Promise.resolve()
    },
    publish (channel, message) {
      emitter.emit('event', channel, message)
    },
    quit () {}
  }
}

function createPubSub (url) {
  return url ? createRedisPubSub(url) : getInProcessPubSub()
}

module.exports = createPubSub
