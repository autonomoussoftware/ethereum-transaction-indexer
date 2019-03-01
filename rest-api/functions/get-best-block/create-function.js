'use strict'

const { pick } = require('lodash')

const logger = require('../../../shared/logger')

function createGetBestBlock (db) {
  // Return the best parsed block
  function getBestBlock (req, res, next) {
    logger.verbose('-->', req.url)

    db.getBestBlock()
      .then(function (block) {
        logger.verbose('<--', block)
        res.json(pick(block, ['number', 'hash', 'totalDifficulty']))
        next()
      })
      .catch(next)
  }

  return getBestBlock
}

module.exports = createGetBestBlock
