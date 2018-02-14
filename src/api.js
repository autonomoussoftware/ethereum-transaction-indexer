const { apiPort } = require('config')
const restify = require('restify')
const debug = require('debug')('eis.api')

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
  const { from = 0, to } = req.query
  return Promise.resolve(to || db.get('best-block'))
    .then(function (max) {
      return db.zrangebyscore(address, from, max)
        .then(function (transactions) {
          debug('<--', address, transactions.length)
          res.json(transactions)
          next()
        })
    })
}

server.get('/addresses/:address/transactions', getAddressTransactions)

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
