'use strict'

const promiseAllProps = require('promise-all-props')
const Router = require('restify-router').Router

const merge = require('../../lib/merge')
const pkg = require('../../package')

const db = require('../db')
const logger = require('../logger')

const router = new Router()

const getBestBlock = () => db.get('best-block').then(JSON.parse)

const getBestBlockNumber = () => getBestBlock().then(b => b.number)

function getRoot (req, res) {
  res.send({ name: pkg.name, version: pkg.version })
}

function getAddrsTransactions (req, res, next) {
  const address = req.params.address.toLowerCase()
  const { from: min = 0, to } = req.query
  return Promise.resolve(to || getBestBlockNumber())
    .then(max => db.zrangebyscore(`eth:${address}`, min, max)
      .then(function (transactions) {
        logger.info('<-- eth', address, min, max, transactions.length)
        res.json(transactions)
        next()
      }))
}

const ADDRESS_SIZE = 20

function getAddrsTokenTransactions (req, res, next) {
  const address = req.params.address.toLowerCase()
  const { from: min = 0, to, tokens } = req.query

  return promiseAllProps({
    max: to || getBestBlockNumber(),
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

function getBlocksBest (req, res, next) {
  getBestBlock()
    .then(function (bestBlock) {
      logger.info('<--', bestBlock)
      res.json(bestBlock)
      next()
    })
}

// DEPRECATED
function getBlocksLatestNumber (req, res, next) {
  getBestBlockNumber()
    .then(function (number) {
      logger.info('<--', number)
      res.json({ number })
      next()
    })
}

router.get('/', getRoot)
router.get('/blocks/best', getBlocksBest)
router.get('/blocks/latest/number', getBlocksLatestNumber)
router.get('/addresses/:address/transactions', getAddrsTransactions)
router.get('/addresses/:address/tokentransactions', getAddrsTokenTransactions)

module.exports = router
