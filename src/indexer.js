const { pauseOnError } = require('config')
const debug = require('debug')('eis.indexer')

const asyncSetTimeout = require('../lib/async-set-timeout')
const toLowerCase = require('../lib/to-lowercase')

const { parseBlock } = require('./parser')
const db = require('./db')
const web3 = require('./web3')

// store parsed address to transaction data in the db
function storeParsedInfo ({ number, data }) {
  return Promise.all(data.map(function ({ hash, addresses }) {
    return Promise.all(addresses.map(toLowerCase).map(function (address) {
      console.log('Indexed', address, hash)
      return db.zadd(address, number, hash)
    }))
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
