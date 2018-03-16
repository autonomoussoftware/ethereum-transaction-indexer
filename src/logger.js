'use strict'

const { logger: loggerConf } = require('config')
const winston = require('winston')
require('winston-papertrail')

const transports = Object.keys(loggerConf)
  .map(t => loggerConf[t] && new winston.transports[t](loggerConf[t]))
  .filter(t => !!t)

const logger = new winston.Logger({ transports })

module.exports = logger
