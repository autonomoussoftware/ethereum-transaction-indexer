'use strict'

const { apiPort } = require('config')
const beforeExit = require('before-exit')
const restify = require('restify')

const logger = require('../logger')

const routes = require('./routes')

const server = restify.createServer()

server.use(restify.plugins.queryParser())

function logRequest (req, res, next) {
  logger.verbose('-->', req.url)
  return next()
}

server.use(logRequest)

function start () {
  beforeExit.do(function (signal) {
    logger.error('Shutting down API on signal', signal)
  })

  routes.applyRoutes(server)

  server.listen(apiPort, function () {
    logger.info(`API started on port ${apiPort}`)
  })
}

module.exports = { start }
