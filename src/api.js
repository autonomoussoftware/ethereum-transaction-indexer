const { apiPort } = require('config')
const restify = require('restify')

const db = require('./db')

const server = restify.createServer()

function logRequest (req, res, next) {
  console.log('-->', req.url)
  return next()
}

server.use(logRequest)

function getAddressTransactions (req, res, next) {
  const address = req.params.address.toLowerCase()
  db.smembers(address)
    .then(function (transactions) {
      console.log('<--', address, transactions.length)
      res.json(transactions)
      next()
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
