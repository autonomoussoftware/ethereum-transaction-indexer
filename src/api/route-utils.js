'use strict'

// handle promise-returning middleware functions
const promiseToMiddleware = middleware => function (req, res, next) {
  Promise.resolve(middleware(req, res))
    .then(next)
    .catch(next)
}

module.exports = { promiseToMiddleware }
