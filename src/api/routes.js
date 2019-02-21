'use strict'

const { pick } = require('lodash')
const restifyErrors = require('restify-errors')
const Router = require('restify-router').Router

const logger = require('../logger')
const web3 = require('../web3')

const { promiseToMiddleware } = require('./route-utils')
const { parseCardinal, parseQuery } = require('./query-parsers')
const db = require('./db-queries')

const ETH_ADDRESS_FORMAT = '^0x[0-9a-fA-F]{40}$'

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
      res.json(transactions.reverse())
    })
}

// return the best parsed block
const getBlocksBest = (req, res) =>
  db.getBestBlock()
    .then(function (block) {
      logger.verbose('<--', block)
      res.json(pick(block, ['number', 'hash', 'totalDifficulty']))
    })

// return the last known block
const getBlocksLast = (req, res) =>
  web3.eth.getBlock('latest')
    .then(function (block) {
      logger.verbose('<--', block)
      res.json(pick(block, ['number', 'hash', 'totalDifficulty']))
    })

const router = new Router()

router.get(
  '/blocks/best',
  promiseToMiddleware(getBlocksBest)
)

router.get(
  '/blocks/last',
  promiseToMiddleware(getBlocksLast)
)

router.get(
  `/addresses/:address(${ETH_ADDRESS_FORMAT})/transactions`,
  promiseToMiddleware(getAddressTransactions)
)

module.exports = router
