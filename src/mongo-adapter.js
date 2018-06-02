'use strict'

const { map } = require('lodash/fp')
const { maxReorgWindow, mongo: { url, dbName } } = require('config')
const MongoClient = require('mongodb').MongoClient

const createClientFor = () =>
  MongoClient.connect(url, { useNewUrlParser: true })

function initCollections (client) {
  const db = client.db(dbName)
  return Promise.all([
    db.createCollection('blocks', {
      capped: true,
      size: 16 * 1024 * 1024,
      max: maxReorgWindow / 15
    })
  ])
    .then(() => client)
}

function createApi (client) {
  const db = client.db(dbName)
  return {
    db: {
      set: (key, value) => db.collection('values')
        .updateOne({ key }, { $set: { value } }, { upsert: true }),
      get: key => db.collection('values')
        .findOne({ key })
        .then(doc => doc ? doc.value : null),
      del: key => db.collection('values')
        .removeOne({ key }),
      sadd: (key, member) => db.collection('sets')
        .updateOne(
          { key },
          { $addToSet: { members: member } },
          { upsert: true }
        ),
      smembers: key => db.collection('sets')
        .findOne({ key })
        .then(doc => doc ? doc.members : []),
      zadd: (key, score, member) => db.collection(key)
        .updateOne(
          { score },
          { $set: { member } },
          { upsert: true }
        ),
      zrangebyscore: (key, min, max) => db.collection(key)
        .find({ $and: [{ score: { $gte: min } }, { score: { $lte: max } }] })
        .toArray()
        .then(array => array.map(doc => doc.member)),
      zrem: (key, member) => db.collection(key)
        .deleteMany({ member }),
      keys: pattern => db
        .listCollections({ name: { $regex: `^${pattern.replace('*', '')}` } })
        .toArray()
        .then(map('name')),
      expire: () => undefined
    },
    close: client.close.bind(client)
  }
}

const createClient = () =>
  createClientFor(url)
    .then(initCollections)
    .then(createApi)

module.exports = createClient
