'use strict'

const { pubsub, redis: { url } } = require('config')

const logger = require('../logger')
const getPubsSub = require('../pubsub')

const sub = getPubsSub(pubsub === 'redis' && url)

// attach to DB events and emit to subscribers
function attachToDb (io) {
  sub.on('pmessage', function (pattern, channel, message) {
    logger.verbose('Received new event', pattern, channel)

    const [event, room] = channel.split(':')
    const [txid, status] = message.split(':')

    const data = { txid, status }

    logger.verbose('<<--', { room, event, data })
    io.to(room).emit(event, data)
  })

  return sub.psubscribe('tx:*')
}

// detach from DB events
const detachFromDb = () => sub.quit()

module.exports = { attachToDb, detachFromDb }
