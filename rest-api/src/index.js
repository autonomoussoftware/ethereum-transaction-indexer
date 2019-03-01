'use strict'

const { port } = require('config')
const restify = require('restify')

const logger = require('../../shared/logger')
const createDbClient = require('../../shared/db')

const createRouter = require('./routes')
const createQueries = require('./db-queries')

const server = restify.createServer()

server.use(restify.plugins.queryParser())

// eslint-disable-next-line max-params
server.on('restifyError', function (req, res, err, callback) {
  logger.warn('<--', err.name, err.message)
  logger.debug(err.stack)
  return callback()
})

// Start the web server
function start (config) {
  return createDbClient(config)
    .then(createQueries)
    .then(createRouter)
    .then(function (router) {
      router.applyRoutes(server)
      server.listen(port, function () {
        logger.info('Ready to receive requests')
      })
    })
}

module.exports = { start }
