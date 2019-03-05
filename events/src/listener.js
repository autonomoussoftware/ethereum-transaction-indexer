'use strict'

const logger = require('../../shared/src/logger')
const getPubsSub = require('../../shared/src/pubsub')

// Attach to DB events and emit to subscribers
function attachToDb (config, io) {
  const sub = getPubsSub(config.redis.url)

  sub.on('pmessage', function (pattern, channel, message) {
    logger.verbose('Received new event %s %s', pattern, channel)

    const [event, room] = channel.split(':')
    const [txid, status] = message.split(':')

    const data = { type: 'eth', txid, status }

    logger.verbose('<<-- %s %s %s %s', room, event, data.txid, data.status)
    io.to(room).emit(event, data)
  })

  return sub.psubscribe('tx:*')
}

module.exports = attachToDb
