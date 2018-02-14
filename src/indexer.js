const { pauseOnError } = require('config')
const debug = require('debug')('eis.indexer')

const asyncSetTimeout = require('../lib/async-set-timeout')

const { parseBlock } = require('./parser')
const db = require('./db')
const web3 = require('./web3')

// store ETH transaction data
function storeEthTransactions ({ number, data: { addresses, txid } }) {
  return Promise.all(addresses.map(function (address) {
    console.log('Indexed', address, number, txid)
    return db.zadd(`eth:${address}`, number, txid)
  }))
}

// store token transaction data
function storeTokenTransactions ({ number, data: { tokens, txid } }) {
  return Promise.all(tokens.map(function ({ addresses, token }) {
    return Promise.all(addresses.map(function (address) {
      console.log('Indexed', address, token, number, txid)
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
  debug('Indexing block', number)
  return db.get('best-block')
    .then(best => Number.parseInt(best || '-1', 10))
    .then(function (best) {
      if (best >= number) {
        debug('Already indexed', number)
        return
      }
      const next = best + 1

      return parseBlock(next)
        .then(function (data) {
          return storeParsedInfo({ number: next, data })
        }).then(function () {
          console.log('New best block', next)
          return db.set('best-block', next)
        }).then(function () {
          return indexBlocks(number)
        })
    })
}

// index all existing blocks in the blockchain
function indexPastBlocks () {
  debug('Indexing past blocks')
  return web3.eth.getBlockNumber()
    .then(indexBlocks)
}

// start listening for new blocks to index
function indexIncomingBlocks () {
  debug('Starting block listener')
  web3.ws.eth.subscribe('newBlockHeaders')
    .on('data', function ({ number }) {
      debug('New block', number)
      indexBlocks(number)
        .catch(function (err) {
          console.error('Import block error', err)
        })
    })
    .on('error', function (err) {
      console.error('Subscription error', err)
      asyncSetTimeout(pauseOnError)
        .then(() => start())
    })
}

// start indexing
function start () {
  return indexPastBlocks()
    .then(indexIncomingBlocks)
    .catch(function (err) {
      console.warn('Index block failed', err)
      return asyncSetTimeout(pauseOnError)
        .then(() => start())
    })
}

module.exports = {
  start
}
