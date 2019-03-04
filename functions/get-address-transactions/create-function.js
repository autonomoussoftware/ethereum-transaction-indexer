'use strict'

const { BadRequestError } = require('restify-errors')

const logger = require('../../shared/src/logger')

function parseCardinal (str) {
  if (!/^[0-9]*$/.test(str)) {
    return NaN
  }
  return Number.parseInt(str, 10)
}

function createGetAddressTransactions (db) {
// return all ETH transactions of an address
  function getAddressTransactions (req, res, next) {
    logger.verbose('--> %s', req.url)

    const address = req.params.address.toLowerCase()
    const { from, to } = req.query

    const _from = from && parseCardinal(from)
    const _to = to && parseCardinal(to)

    const errors = []
    if (Number.isNaN(_from)) {
      errors.push('from')
    }
    if (Number.isNaN(_to)) {
      errors.push('to')
    }
    if (errors.length) {
      next(new BadRequestError(`Invalid query: ${errors.join(', ')}`))
      return
    }

    db.getAddressTransactions({ address, from: _from, to: _to })
      .then(function (transactions) {
        logger.verbose('<-- %s txs: %d', address, transactions.length)
        res.json(transactions.reverse())
        next()
      })
      .catch(next)
  }

  return getAddressTransactions
}

module.exports = createGetAddressTransactions
