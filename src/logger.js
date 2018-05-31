'use strict'

const { logger: loggerConf } = require('config')
const winston = require('winston')
require('winston-papertrail')
require('winston-sentry-transport')

const reqProps = {
  Sentry: 'dns',
  Papertrail: 'host'
}

const transports = Object.keys(loggerConf)
  .map(t =>
    loggerConf[t] &&
    (reqProps[t] ? loggerConf[t][reqProps[t]] : true) &&
    new winston.transports[t](loggerConf[t])
  )
  .filter(t => !!t)

const logger = new winston.Logger({ transports })

module.exports = logger
