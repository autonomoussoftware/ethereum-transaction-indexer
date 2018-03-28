'use strict'
const promiseAllProps = require('promise-all-props')
const Router = require('restify-router').Router

const merge = require('../../lib/merge')
const pkg = require('../../package')

const db = require('../db')
const logger = require('../logger')

const router = new Router()

function getRoot (req, res) {
  res.send({ name: pkg.name, version: pkg.version })
}

function getAddressTransactions (req, res, next) {
  const address = req.params.address.toLowerCase()
  const { from: min = 0, to } = req.query
  return Promise.resolve(to || db.get('best-block'))
    .then(max => db.zrangebyscore(`eth:${address}`, min, max)
      .then(function (transactions) {
        logger.info('<-- eth', address, min, max, transactions.length)
        res.json(transactions)
        next()
      }))
}

const ADDRESS_SIZE = 20
function getAddressTokenTransactions (req, res, next) {
  const address = req.params.address.toLowerCase()
  const { from: min = 0, to, tokens } = req.query

  return promiseAllProps({
    max: to || db.get('best-block'),
    sets: tokens
      ? tokens.split(',').map(t => `tok:${address}:${t}`)
      : db.keys(`tok:${address}:*`)
  })
    .then(({ max, sets }) => Promise.all(sets.map(function (set) {
      const token = set.substr(-(2 + ADDRESS_SIZE * 2))
      return db.zrangebyscore(set, min, max)
        .then(transactions => ({ [token]: transactions }))
    }))
      .then(merge)
      .then(function (transactions) {
        logger.info('<-- tok', address, min, max, Object.keys(transactions))
        res.json(transactions)
        next()
      })
    )
}

function getBestBlockNumber (req, res, next) {
  db.get('best-block')
    .then(function (number) {
      logger.info('<--', number)
      res.json({ number })
      next()
    })
}

router.get('/', getRoot)
router.get('/blocks/latest/number', getBestBlockNumber)
router.get('/addresses/:address/transactions', getAddressTransactions)
router.get('/addresses/:address/tokentransactions', getAddressTokenTransactions)

module.exports = router
