'use strict'

const MongoClient = require('mongodb').MongoClient

// Create a client that connects to the provided URL
const createClientFor = url =>
  MongoClient.connect(url, { useNewUrlParser: true })

// Initialize all capped collections
const initCollections = dbName => function (client) {
  const db = client.db(dbName)
  return db.createCollection('bestBlock', { capped: true, size: 1024, max: 1 })
    .then(() => client)
}

// Create the Mongo indexer-specific API
const createApi = (dbName, maxBlocks) => function (client) {
  const db = client.db(dbName)
  return {
    db: {
      insertBestBlock: data => db.collection('bestBlock')
        .insertOne(data),

      findBestBlock: () => db.collection('bestBlock')
        .findOne({}),

      upsertBlock: ({ number, addr }) => db.collection('blocks')
        .updateOne(
          { number },
          { $addToSet: { addrs: addr } },
          { upsert: true }
        ).then(() => db.collection('blocks')
          .deleteMany({ number: { $lte: number - maxBlocks } })
        ),

      findBlockAddresses: ({ number }) => db.collection('blocks')
        .findOne({ number })
        .then(block => block ? block.addrs : []),

      deleteBlock: ({ number }) => db.collection('blocks')
        .updateOne(
          { number },
          { $unset: { addrs: undefined } }
        ),

      upsertAddress: ({ addr, number, txid }) =>
        db.collection(addr)
          .updateOne(
            { number },
            { $set: { txid } },
            { upsert: true }
          ),

      findAddressTransactions: ({ addr, min, max }) =>
        db.collection(addr)
          .find({ number: { $gte: min, $lte: max } })
          .toArray()
          .then(blocks => blocks.map(block => block.txid)),

      deleteAddressTransaction: ({ addr, txid }) =>
        db.collection(addr)
          .deleteOne({ txid })
    }
  }
}

// Initialize the Mongo client, collections and return the indexer API object
const createClient = (url, dbName, maxBlocks) =>
  createClientFor(url)
    .then(initCollections(dbName))
    .then(createApi(dbName, maxBlocks))

module.exports = createClient
