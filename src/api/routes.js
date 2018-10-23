'use strict'

const restifyErrors = require('restify-errors')
const Router = require('restify-router').Router

const pkg = require('../../package')

const logger = require('../logger')

const { promiseToMiddleware } = require('./route-utils')
const {
  parseCardinal,
  parseQuery
} = require('./query-parsers')
const db = require('./db-queries')

const ETH_ADDRESS_FORMAT = '^0x[0-9a-fA-F]{40}$'

const router = new Router()

// return basic service info
function getRoot (req, res) {
  res.send({ name: pkg.name, version: pkg.version })
}

// return all ETH transactions of an address
function getAddressTransactions (req, res) {
  const address = req.params.address.toLowerCase()
  const { errors, query } = parseQuery([
    parseCardinal('from'),
    parseCardinal('to')
  ], req.query)

  if (errors.length) {
    return Promise.reject(new restifyErrors.BadRequestError(
      `Invalid query options: ${errors.join(', ')}`
    ))
  }

  const { from, to } = query

  return db.getAddressTransactions({ address, from, to })
    .then(function (transactions) {
      logger.verbose(`<-- ${address} txs: ${transactions.length}`)
      res.json(transactions)
    })
}

// return the best parsed block
const getBlocksBest = (req, res) =>
  db.getBestBlock()
    .then(function (bestBlock) {
      logger.verbose('<--', bestBlock)
      res.json(bestBlock)
    })

router.get(
  '/',
  promiseToMiddleware(getRoot)
)

router.get(
  '/v1/blocks/best',
  promiseToMiddleware(getBlocksBest)
)

router.get(
  `/v1/addresses/:address(${ETH_ADDRESS_FORMAT})/transactions`,
  promiseToMiddleware(getAddressTransactions)
)

module.exports = router
