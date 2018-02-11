const { redisUrl } = require('config')
const redis = require('redis')
const util = require('util')

const client = redis.createClient({ url: redisUrl })

client.on('error', function (err) {
  console.error('ERROR', err)
})

const get = util.promisify(client.get.bind(client))
const set = util.promisify(client.set.bind(client))
const sadd = util.promisify(client.sadd.bind(client))
const smembers = util.promisify(client.smembers.bind(client))

module.exports = {
  get,
  set,
  sadd,
  smembers
}
