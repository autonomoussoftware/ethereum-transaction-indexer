'use strict'

const db = require('../db')
const logger = require('../logger')

const sub = db.pubsub()

// DB events parsers
const patterns = {
  'tx:*' (channel, message) {
    const [event, address] = channel.split(':')
    const [type, txid, status, meta] = message.split(':')

    return {
      room: address,
      event,
      data: { type, txid, status, meta }
    }
  },
  'block' (channel, message) {
    const [hash, number] = message.split(':')

    return {
      room: 'block',
      event: 'block',
      data: { hash, number }
    }
  }
}

// attach to DB events and emit to subscribers
function attachToDb (io) {
  sub.on('pmessage', function (pattern, channel, message) {
    logger.verbose('Received new event', pattern, channel)

    const { room, event, data } = patterns[pattern](channel, message)

    logger.info('<<--', { room, event, data })
    io.to(room).emit(event, data)
  })

  return Promise.all(
    Object.keys(patterns).map(pattern => sub.psubscribe(pattern))
  )
}

// detach from DB events
const detachFromDb = () => sub.quit()

module.exports = { attachToDb, detachFromDb }
