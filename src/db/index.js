'use strict'

const {
  maxReorgWindow,
  mongo: { url: mongoUrl, dbName },
  redis: { url: redisUrl }
} = require('config')

const createMongoClient = require('./mongo')
const createRedisClient = require('./redis')

function init () {
  // Keep record of blocks only within the reorg window. Blocks are mined in
  // average every 15 seconds.
  return mongoUrl
    ? createMongoClient(mongoUrl, dbName, maxReorgWindow / 15)
    : createRedisClient(redisUrl, maxReorgWindow)
}

module.exports = {
  init
}
