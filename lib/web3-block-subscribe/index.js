'use strict'

const debug = require('debug')('web3-block-subscribe')
const timeBombs = require('time-bombs')
const Web3 = require('web3')

const noop = () => undefined

const pendingUnsubscriptions = []

function tryToUnsubscribe (subscription, callback = noop) {
  const { id } = subscription

  if (!subscription.unsubscribe) {
    setTimeout(function () {
      callback(null, false)
    }, 0)

    return
  }

  debug('(%s) Unsubscribing', id)

  subscription.unsubscribe(function (err, success) {
    if (err) {
      debug('(%s) Could not unsubscribe: %s', id, err.message)

      pendingUnsubscriptions.push(subscription)

      debug('Stored %d pending unsubscriptions', pendingUnsubscriptions.length)

      callback(err)

      return
    }

    debug('(%s) Unsubscribed', id, success)

    subscription.options.requestManager.provider.connection.close()

    debug('(%s) Closing connection', id)

    callback(null, true)
  })
}

function processPendingUnsubscriptions () {
  while (pendingUnsubscriptions.length) {
    tryToUnsubscribe(pendingUnsubscriptions.shift())
  }
}

const TOUT = 60000 // 60 secs
const RETRY = 10000 // 10 secs

function subscribe ({ url, onData, onError, timeout = TOUT, retry = RETRY }) {
  debug('Creating new subscription')

  const web3 = new Web3(new Web3.providers.WebsocketProvider(url))

  const subscription = web3.eth.subscribe('newBlockHeaders')

  function handleError (sub, err) {
    const { id } = sub

    debug('(%s) Subscription error: %s', id, err.message || err.reason)

    onError(err.message ? err : new Error(err.reason))

    tryToUnsubscribe(sub)

    setTimeout(function () {
      debug('Retrying subscription')

      subscribe({ url, onData, onError, timeout, retry })
    }, retry)
  }

  function handleTimeOut () {
    handleError(subscription, new Error('Subscription timeout'))
  }

  const bomb = timeBombs.create(timeout, handleTimeOut)

  subscription.on('data', function (header) {
    debug('(%s) New block header: %s', subscription.id, header.hash)

    bomb.reset(timeout)

    onData(header)

    processPendingUnsubscriptions()
  })

  subscription.on('error', function (err) {
    bomb.deactivate()

    handleError(subscription, err)
  })

  return {
    unsubscribe (callback) {
      tryToUnsubscribe(subscription, callback)
    }
  }
}

module.exports = { subscribe }
