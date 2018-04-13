'use strict'

const { port } = require('config')
const beforeExit = require('before-exit')
const restify = require('restify')

const logger = require('../logger')

const routes = require('./routes')
const events = require('./events')

const server = restify.createServer({ socketio: true })

server.use(restify.plugins.queryParser())

function logRequest (req, res, next) {
  logger.verbose('-->', req.url)
  return next()
}

server.use(logRequest)

function start () {
  beforeExit.do(function (signal) {
    logger.error('Shutting down API on signal', signal)

    return events.detach()
  })

  routes.applyRoutes(server)

  // eslint-disable-next-line max-params
  server.on('restifyError', function (req, res, err, callback) {
    logger.warn('<--', err.name, err.message)
    logger.debug('Could not send successfull response', err.stack)
    return callback()
  })

  server.listen(port, function () {
    logger.info(`API started on port ${port}`)

    events.attach(server)
      .then(function () {
        logger.info('Events interfase is up')
      })
      .catch(function (err) {
        logger.error('Could not start events interface', err.message)

        // Should not continue if unable to start the events interface
        process.exit(1)
      })
  })
}

module.exports = { start }
