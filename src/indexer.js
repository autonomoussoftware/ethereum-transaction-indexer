const { pauseOnError } = require('config')
const debug = require('debug')('indexer')

const { parseBlock } = require('./parser')
const { http: web3http, ws: web3ws } = require('./web3')
const db = require('./db')

const toLowerCase = str => str.toLowerCase()

// store parsed address to transaction data in the db
function storeParsedInfo ({ number, data }) {
  return Promise.all(data.map(function ({ hash, addresses }) {
    return Promise.all(addresses.map(toLowerCase).map(function (address) {
      console.log('Indexed', address, hash)
      return db.zadd(address, number, hash)
    }))
  }))
}

// settimeout promisified
function asyncSetTimeout (timeout) {
  return new Promise(function (resolve) {
    setTimeout(resolve, timeout)
  })
}

// index the next block recursively up to the latest
function indexNextBlock (number) {
  debug('indexNextBlock', number)
  return web3http.eth.getBlockNumber()
    .then(function (latest) {
      if (number > latest) {
        debug('Already at top', latest)
        return
      }

      return parseBlock(number)
        .then(function (data) {
          return storeParsedInfo({ number, data })
        }).then(function () {
          console.log('New best block', number)
          return db.set('best-block', number)
        }).then(function () {
          return number + 1
        }).then(function (next) {
          return indexNextBlock(next)
        })
    })
    .catch(function (err) {
      console.warn('WARN', err)
      return asyncSetTimeout(pauseOnError)
        .then(() => indexNextBlock(number))
    })
}

// parse the block looking for addresses in transactions
function parseBlockNumber (number) {
  return Number.parseInt('' + number, 10)
}

// start listening for blocks to parse
function startBlockListener () {
  console.log('Starting block listener')
  web3ws.eth.subscribe('newBlockHeaders')
    .on('data', function ({ number }) {
      indexNextBlock(number)
        .catch(function (err) {
          console.error('ERROR', err)
        })
    })
    .on('error', function (err) {
      console.error('ERROR', err)
    })
}

// start indexing the by the next block
function start () {
  return db.get('best-block')
    .then(function (best) {
      console.log('Current best block', best || 'none')
      return indexNextBlock(best ? parseBlockNumber(best) + 1 : 0)
    })
    .then(function () {
      startBlockListener()
    })
}

module.exports = {
  start
}
