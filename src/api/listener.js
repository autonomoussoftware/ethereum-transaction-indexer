'use strict'

const logger = require('../logger')
const pubsub = require('../pubsub')

const sub = pubsub()

// DB events parsers
const patterns = {
  'tx:*' (channel, message) {
    const [event, address] = channel.split(':')
    const [txid, status] = message.split(':')

    return {
      room: address,
      event,
      data: { txid, status }
    }
  }
}

// attach to DB events and emit to subscribers
function attachToDb (io) {
  sub.on('pmessage', function (pattern, channel, message) {
    logger.verbose('Received new event', pattern, channel)

    const { room, event, data } = patterns[pattern](channel, message)

    logger.verbose('<<--', { room, event, data })
    io.to(room).emit(event, data)
  })

  return Promise.all(
    Object.keys(patterns).map(pattern => sub.psubscribe(pattern))
  )
}

// detach from DB events
const detachFromDb = () => sub.quit()

module.exports = { attachToDb, detachFromDb }
