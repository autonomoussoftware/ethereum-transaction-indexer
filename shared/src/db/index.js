'use strict'

const createMongoClient = require('./mongo')
const createRedisClient = require('./redis')

function createClient (config, exposeClient) {
  const { dbEngine, maxReorgWindow } = config

  // Keep record of blocks only within the reorg window. Blocks are mined in
  // average every 15 seconds.
  const maxBlocks = maxReorgWindow / 15

  if (dbEngine === 'mongo') {
    return createMongoClient(config.mongo, maxBlocks, exposeClient)
  } else if (dbEngine === 'redis') {
    return createRedisClient(config.redis, maxBlocks, exposeClient)
  }

  return Promise.reject(new Error('Invalid database engine'))
}

module.exports = createClient
