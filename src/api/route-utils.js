'use strict'

const logger = require('../logger')

const deprecated = function (req, res, next) {
  logger.warn(`Deprecated call to ${req.url}`)
  next()
}

const promiseToMiddleware = middleware => function (req, res, next) {
  Promise.resolve(middleware(req, res))
    .then(next)
    .catch(next)
}

module.exports = { deprecated, promiseToMiddleware }
