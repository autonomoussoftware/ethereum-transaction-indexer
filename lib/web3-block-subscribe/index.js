const debug = require('debug')('web3-block-subscribe')
const Web3 = require('web3')

const timeBombs = require('../time-bombs')

const noop = () => {}

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

    callback(null, true)
  })
}

function processPendingUnsubscriptions () {
  while (pendingUnsubscriptions.length) {
    tryToUnsubscribe(pendingUnsubscriptions.shift())
  }
}

function subscribe ({ url, onData, onError, timeout = 60000, retry = 10000 }) {
  const bomb = timeBombs.create(timeout)

  function handleError (subscription, err) {
    const { id } = subscription

    debug('(%s) Subscription error: %s', id, err.message || err.reason)

    bomb.deactivate()

    onError(err.message ? err : new Error(err.reason))

    tryToUnsubscribe(subscription)

    setTimeout(function () {
      debug('Retrying subscription')

      subscribe({ url, onData, onError, timeout, retry })
    }, retry)
  }

  debug('Creating new subscription')

  const web3 = new Web3(new Web3.providers.WebsocketProvider(url))

  const subscription = web3.eth.subscribe('newBlockHeaders')

  subscription.on('data', function (header) {
    debug('(%s) New block header: %s', subscription.id, header.hash)

    bomb.reset(timeout)

    onData(header)

    processPendingUnsubscriptions()
  })

  subscription.on('error', function (err) {
    handleError(subscription, err)
  })

  bomb.onBoom(function () {
    handleError(subscription, new Error('Subscription timeout'))
  })

  return { unsubscribe: () => tryToUnsubscribe(subscription) }
}

module.exports = { subscribe }
