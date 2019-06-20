'use strict'

const { isAddress, isHexStrict } = require('web3-utils')
const { isArray, negate, noop, overEvery, some } = require('lodash')
const { toLower } = require('lodash')
const SocketIoServer = require('socket.io')

const logger = require('../../shared/src/logger')

// Join each address room to receive transactions
function subscribeToTransactions (maxAddresses, socket, addresses, ack) {
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
  if (some(addresses, negate(overEvery([isHexStrict, isAddress])))) {
    logger.warn('Subscription rejected: invalid addresses')
    ack('invalid addresses')
    return
  }

  logger.verbose('-->> subscribe txs', addresses)

  socket.join(addresses.map(toLower), function (err) {
    if (err) {
      logger.warn('Could not complete subscription', err.message)
      ack('error on subscription')
      return
    }

    logger.verbose('Subscription to txs processed', addresses)

    ack()
  })
}

// Create a Socket.IO server and attach it to an HTTP server
function attach (config, httpServer) {
  const { maxAddresses } = config

  const io = new SocketIoServer(httpServer).of('v1')

  io.on('connection', function (socket) {
    logger.verbose('New connection', socket.id)

    socket.on('subscribe', function (data = {}, ack = noop) {
      const { type } = data

      if (!type || !['blocks', 'txs'].includes(type)) {
        logger.warn('Subscription rejected: invalid subscription type')
        ack('invalid subscription type')
        return
      }

      if (type === 'txs') {
        subscribeToTransactions(maxAddresses, socket, data.addresses, ack)
      }

      // `block` subscriptions are no longer supported, hence doing nothing
    })

    socket.on('disconnect', function (reason) {
      logger.verbose('Connection closed', socket.id, reason)
    })
  })

  return io
}

module.exports = attach
