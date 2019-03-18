'use strict'

const logger = require('../../shared/src/logger')
const getPubsSub = require('../../shared/src/pubsub')

// Attach to DB events and emit to subscribers
function attachToDb (config, io) {
  const sub = getPubsSub(config.redis.url)

  const { dbnum } = sub

  sub.on('pmessage', function (pattern, channel, message) {
    logger.verbose('Received new event %s %s', pattern, channel)

    const [_dbnum, event, room] = channel.split(':')
    const [txid, status] = message.split(':')

    const data = { type: 'eth', txid, status }

    if (_dbnum !== dbnum) {
      logger.warn('Received event from invalid keyspace')
      return
    }

    logger.verbose('<<-- %s %s %s %s', room, event, data.txid, data.status)
    io.to(room).emit(event, data)
  })

  return sub.psubscribe(`${dbnum}:tx:*`)
}

module.exports = attachToDb
