'use strict'

const { pauseOnError, websocketApiUrl } = require('config')

const asyncSetTimeout = require('../lib/async-set-timeout')
const { subscribe } = require('../lib/web3-block-subscribe')

const { parseBlock } = require('./parser')
const db = require('./db')
const logger = require('./logger')
const web3 = require('./web3')

// store ETH transaction data
function storeEthTransactions ({ number, data: { addresses, txid } }) {
  return Promise.all(addresses.map(function (address) {
    logger.info('Transaction indexed', address, number, txid)
    return db.zadd(`eth:${address}`, number, txid)
  }))
}

// store token transaction data
function storeTokenTransactions ({ number, data: { tokens, txid } }) {
  return Promise.all(tokens.map(function ({ addresses, token }) {
    return Promise.all(addresses.map(function (address) {
      logger.info('Token transaction indexed', address, token, number, txid)
      return db.zadd(`tok:${address}:${token}`, number, txid)
    }))
  }))
}

// store parsed address to transaction data in the db
function storeParsedInfo ({ number, data }) {
  return Promise.all(data.map(function ({ eth, tok }) {
    return Promise.all([
      storeEthTransactions({ number, data: eth }),
      storeTokenTransactions({ number, data: tok })
    ])
  }))
}

// index a single block and then recursively up
function indexBlocks (number) {
  logger.verbose('Indexing up to block', number)
  return db.get('best-block')
    .then(best => Number.parseInt(best || '-1', 10))
    .then(function (best) {
      if (best >= number) {
        logger.verbose('Block already indexed', number)
        return
      }
      const next = best + 1

      return parseBlock(next)
        .then(function (data) {
          return storeParsedInfo({ number: next, data })
        }).then(function () {
          logger.info('New best block', next)
          return db.set('best-block', next)
        }).then(function () {
          return indexBlocks(number)
        })
    })
}

// index all existing blocks in the blockchain
function indexPastBlocks () {
  logger.info('Indexing past blocks')
  return web3.eth.getBlockNumber()
    .then(indexBlocks)
    .catch(function (err) {
      logger.warn('Could not index past block', err)
      return asyncSetTimeout(pauseOnError)
        .then(() => indexPastBlocks())
    })
}

// start listening for new blocks to index
function indexIncomingBlocks () {
  logger.info('Starting block listener')
  subscribe({
    url: websocketApiUrl,
    onData: function ({ number }) {
      logger.verbose('New block received', number)
      indexBlocks(number)
        .catch(function (err) {
          logger.warn('Could not index new block', err)
        })
    },
    onError: function (err) {
      logger.warn('Subscription failure', err)
    }
  })
}

// start indexing
function start () {
  return indexPastBlocks()
    .then(indexIncomingBlocks)
}

module.exports = {
  start
}
