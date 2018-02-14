const { redisUrl } = require('config')
const redis = require('redis')
const util = require('util')

const client = redis.createClient({ url: redisUrl })

client.on('error', function (err) {
  console.error('Redis error', err)
})

// string keys
const get = util.promisify(client.get.bind(client))
const set = util.promisify(client.set.bind(client))

// sets
const sadd = util.promisify(client.sadd.bind(client))
const smembers = util.promisify(client.smembers.bind(client))

// sorted sets
const zadd = util.promisify(client.zadd.bind(client))
const zrangebyscore = util.promisify(client.zrangebyscore.bind(client))

// utils
const keys = util.promisify(client.keys.bind(client))

module.exports = {
  get,
  set,
  sadd,
  smembers,
  zadd,
  zrangebyscore,
  keys
}
