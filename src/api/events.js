'use strict'

const { events: { maxAddresses } } = require('config')
const { isArray, negate, noop, some } = require('lodash')
const { toLower } = require('lodash')
const SocketIoServer = require('socket.io')

const isEthAddress = require('../../lib/is-eth-address')

const logger = require('../logger')

const { attachToDb, detachFromDb } = require('./listener')

function attach (httpServer) {
  const io = new SocketIoServer(httpServer).of('v1')

  io.on('connection', function (socket) {
    logger.verbose('New connection', socket.id)

    socket.on('subscribe', function (addresses, ack = noop) {
      if (!isArray(addresses)) {
        logger.warn('Subscription rejected: invalid subscription')
        ack('invalid subscription')
        return
      }
      if (addresses.length > maxAddresses) {
        logger.warn('Subscription rejected: too many addresses')
        ack('too many addresses')
        return
      }
      if (some(addresses, negate(isEthAddress))) {
        logger.warn('Subscription rejected: invalid addresses')
        ack('invalid addresses')
        return
      }

      socket.join(addresses.map(toLower), function (err) {
        if (err) {
          logger.warn('Could not complete subscription', err.message)
          ack('error on subscription')
          return
        }

        logger.verbose('Subscription processed', addresses)

        ack()
      })
    })

    socket.on('disconnect', function (reason) {
      logger.verbose('Connection closed', reason)
    })
  })

  return attachToDb(io)
}

const detach = detachFromDb

module.exports = { attach, detach }
