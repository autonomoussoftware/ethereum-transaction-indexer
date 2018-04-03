'use strict'

const { websocketTimeout } = require('config')
const EventEmitter = require('events')
const timeBombs = require('time-bombs')
const WebSocketServer = require('websocket').server

const db = require('../db')
const logger = require('../logger')

const MAX_WS_MSG_SIZE = 1024

const emitters = {}

let subscriptions = []

function attachEmitter (connection, address) {
  const addressEmitter = new EventEmitter()
  addressEmitter.on('tx', function (data) {
    logger.verbose('Sending tx event', data)
    connection.sendUTF(JSON.stringify({ event: 'tx', data }))
  })

  emitters[address] = emitters[address] || []
  emitters[address].push(addressEmitter)

  subscriptions.push({ connection, emitter: addressEmitter, address })
}

function detachEmitters (connection) {
  subscriptions
    .filter(subscription => subscription.connection === connection)
    .forEach(function ({ emitter, address }) {
      emitter.removeAllListeners('tx')
      emitters[address] = emitters[address].filter(e => e !== emitter)
    })

  subscriptions = subscriptions
    .filter(subscription => subscription.connection !== connection)
}

const sub = db.pubsub()

sub.on('pmessage', function (pattern, channel, message) {
  const address = channel

  logger.verbose('Received tx event', address)

  const addressEmitters = emitters[address]

  if (!addressEmitters) {
    return
  }

  logger.debug('Emitting tx event', address, addressEmitters.length)
  addressEmitters.forEach(function (addressEmitter) {
    addressEmitter.emit('tx', message)
  })
})

sub.psubscribe('*')
  .then(function () {
    logger.info('Subscribed to tx events')
  })

function parseMessage (message) {
  if (message.type !== 'utf8') {
    throw new Error(`Unsupported message type: ${message.type}`)
  }

  const messageData = message.utf8Data

  if (messageData.length > MAX_WS_MSG_SIZE) {
    throw new Error(`Message size exceeded: ${messageData.length}`)
  }

  let payload

  try {
    payload = JSON.parse(messageData)
  } catch (err) {
    throw new Error(`Invalid JSON: ${err.message}`)
  }

  return payload
}

const messageHandlers = {
  subscribe (connection, data) {
    data.forEach(function (address) {
      attachEmitter(connection, address)
    })
  },
  ping (connection) {
    connection.sendUTF(JSON.stringify({ event: 'pong' }))
  }
}

function attach (httpServer) {
  const server = new WebSocketServer({
    httpServer
  })

  server.on('request', function (request) {
    const connection = request.accept(null, request.origin)

    logger.verbose('New websocket connection')

    const disconnector = timeBombs.create(websocketTimeout, function () {
      logger.verbose('Connection terminated')
      connection.close()
    })

    connection.on('message', function (message) {
      logger.debug('Message received')

      try {
        const payload = parseMessage(message)
        logger.debug('Websocker message', payload)

        const messageHandler = messageHandlers[payload.event]

        if (!messageHandler) {
          logger.warn('Unsupported message received', payload.event)
        }

        disconnector.reset()

        messageHandler(connection, payload.data)
      } catch (err) {
        logger.warn('Could not parse websocket message', err.message)
      }
    })

    connection.on('close', function (reason, description) {
      logger.verbose('Connection closed', description)

      disconnector.deactivate()

      detachEmitters(connection)
    })
  })
}

const detach = () => sub.quit()

module.exports = { attach, detach }
