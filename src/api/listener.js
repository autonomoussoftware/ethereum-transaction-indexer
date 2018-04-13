'use strict'

const db = require('../db')
const logger = require('../logger')

const sub = db.pubsub()

function attachToDb (io) {
  sub.on('pmessage', function (pattern, channel, message) {
    logger.verbose('Received tx event', channel)

    const [event, address] = channel.split(':')
    const [type, txid, status, meta] = message.split(':')

    io.to(address).emit(event, { type, txid, status, meta })
  })

  return sub.psubscribe('tx:*')
}

const detachFromDb = () => sub.quit()

module.exports = { attachToDb, detachFromDb }
