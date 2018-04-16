'use strict'

const restifyErrors = require('restify-errors')
const Router = require('restify-router').Router

const pkg = require('../../package')

const logger = require('../logger')

const { deprecated, promiseToMiddleware } = require('./route-utils')
const {
  parseAddressesList,
  parseCardinal,
  parseQuery
} = require('./query-parsers')
const db = require('./db-queries')

const ETH_ADDRESS_FORMAT = '^0x[0-9a-fA-F]{40}$'

const router = new Router()

function getRoot (req, res) {
  res.send({ name: pkg.name, version: pkg.version })
}

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
      logger.info(`<-- ${address} txs: ${transactions.length}`)
      res.json(transactions)
    })
}

function getAddressTokenTransactions (req, res) {
  const address = req.params.address.toLowerCase()
  const { errors, query } = parseQuery([
    parseCardinal('from'),
    parseCardinal('to'),
    parseAddressesList('tokens')
  ], req.query)

  if (errors.length) {
    return Promise.reject(new restifyErrors.BadRequestError(
      `Invalid query options: ${errors.join(', ')}`
    ))
  }

  const { from, to, tokens } = query

  return db.getAddressTokenTransactions({ address, from, to, tokens })
    .then(function (transactions) {
      const tokensSeen = Object.keys(transactions).length
      const transactionsSeen = Object.keys(transactions).reduce((sum, token) =>
        transactions[token].length, 0
      )
      logger.info(`<-- ${address} toks: ${tokensSeen} txs: ${transactionsSeen}`)
      res.json(transactions)
    })
}

const getBlocksBest = (req, res) => db.getBestBlock()
  .then(function (bestBlock) {
    logger.info('<--', bestBlock)
    res.json(bestBlock)
  })

const getBlocksLatestNumber = (req, res) => db.getBestBlockNumber()
  .then(function (number) {
    logger.info('<--', number)
    res.json({ number })
  })

router.get(
  '/',
  promiseToMiddleware(getRoot)
)

router.get(
  '/blocks/best',
  promiseToMiddleware(getBlocksBest)
)
router.get(
  '/blocks/latest/number',
  deprecated,
  promiseToMiddleware(getBlocksLatestNumber)
)

router.get(
  `/addresses/:address(${ETH_ADDRESS_FORMAT})/transactions`,
  promiseToMiddleware(getAddressTransactions)
)
router.get(
  `/addresses/:address(${ETH_ADDRESS_FORMAT})/tokentransactions`,
  promiseToMiddleware(getAddressTokenTransactions)
)

module.exports = router
