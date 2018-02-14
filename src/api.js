const { apiPort } = require('config')
const restify = require('restify')
const debug = require('debug')('eis.api')
const promiseAllProps = require('promise-all-props')

const db = require('./db')

const server = restify.createServer()

server.use(restify.plugins.queryParser())

function logRequest (req, res, next) {
  debug('-->', req.url)
  return next()
}

server.use(logRequest)

function getAddressTransactions (req, res, next) {
  const address = req.params.address.toLowerCase()
  const { from: min = 0, to } = req.query
  return Promise.resolve(to || db.get('best-block'))
    .then(function (max) {
      return db.zrangebyscore(`eth:${address}`, min, max)
        .then(function (transactions) {
          debug('<-- eth', address, min, max, transactions.length)
          res.json(transactions)
          next()
        })
    })
}

server.get('/addresses/:address/transactions', getAddressTransactions)

function getAddressTokenTransactions (req, res, next) {
  const address = req.params.address.toLowerCase()
  const { from: min = 0, to, tokens } = req.query

  return promiseAllProps({
    max: to || db.get('best-block'),
    sets: tokens
      ? tokens.split(',').map(t => `tok:${address}:${t}`)
      : db.keys(`tok:${address}:*`)
  })
    .then(function ({ max, sets }) {
      return Promise.all(sets.map(function (set) {
        return db.zrangebyscore(set, min, max)
      }))
        .then(transactions => [].concat(transactions))
        .then(function (transactions) {
          debug('<-- tok', address, min, max, transactions.length)
          res.json(transactions)
          next()
        })
    })
}

server.get('/addresses/:address/tokentransactions', getAddressTokenTransactions)

function getBestBlockNumber (req, res, next) {
  db.get('best-block')
    .then(function (number) {
      console.log('<--', number)
      res.json({ number })
      next()
    })
}

server.get('/blocks/latest/number', getBestBlockNumber)

function start () {
  server.listen(apiPort, function () {
    console.log(`API started on port ${apiPort}`)
  })
}

module.exports = {
  start
}
