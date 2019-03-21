'use strict'

const beforeExit = require('before-exit')
const redis = require('redis')
const url = require('url')
const util = require('util')

const logger = require('./logger')

// Try to parse a URL using the global URL object in Node 10 or fallback to
// legacy `url` module instead.
function parseUrl (_url) {
  try {
    return new URL(_url)
  } catch (err) {
    return new url.URL(_url)
  }
}

// Create and return a Redis Pub-Sub client
function createRedisPubSub (redisUrl) {
  logger.debug('Attaching to pubsub on %s', redisUrl)

  const client = redis.createClient(redisUrl)

  client.on('error', function (err) {
    logger.error('Redis error', err)

    const meta = { inner: err, exitCode: 1 }
    const error = Object.assign(new Error('Redis error'), meta)
    beforeExit.do(() => Promise.reject(error))

    // Can't continue if there is a database error
    process.kill(process.pid, 'SIGINT')
  })

  return {
    dbnum: parseUrl(redisUrl).pathname.replace(/^\//, '') || '0',
    on: client.on.bind(client),
    psubscribe: util.promisify(client.psubscribe.bind(client)),
    publish: util.promisify(client.publish.bind(client)),
    quit: util.promisify(client.quit.bind(client))
  }
}

module.exports = createRedisPubSub
