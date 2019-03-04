'use strict'

const { port } = require('config')
const restify = require('restify')

const logger = require('../../shared/src/logger')
const createDbClient = require('../../shared/src/db')

const createRouter = require('./routes')
const createQueries = require('./db-queries')

// Start the web server
function start (config, options) {
  const server = restify.createServer(options)

  server.use(restify.plugins.queryParser())

  // eslint-disable-next-line max-params
  server.on('restifyError', function (req, res, err, callback) {
    logger.warn('<-- %s %s', err.name, err.message)
    logger.debug(err.stack)
    return callback()
  })

  return createDbClient(config)
    .then(createQueries)
    .then(createRouter)
    .then(function (router) {
      router.applyRoutes(server)
      server.listen(port, function () {
        logger.info('REST API is up')
      })
      return server
    })
}

module.exports = { start }
