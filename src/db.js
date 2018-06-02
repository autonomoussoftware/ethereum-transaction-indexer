'use strict'

const createDbClient = require('./mongo-adapter')

const dbClient = createDbClient()

const redisToMongo = command => (...args) =>
  dbClient.then(api => api.db[command](...args))

// string keys
const get = redisToMongo('get')
const set = redisToMongo('set')

// sets
const sadd = redisToMongo('sadd')
const smembers = redisToMongo('smembers')

// sorted sets
const zadd = redisToMongo('zadd')
const zrangebyscore = redisToMongo('zrangebyscore')
const zrem = redisToMongo('zrem')

// utils
const del = redisToMongo('del')
const expire = redisToMongo('expire')
const keys = redisToMongo('keys')

module.exports = {
  del,
  expire,
  get,
  pubsub,
  sadd,
  set,
  smembers,
  zadd,
  zrangebyscore,
  zrem
}
