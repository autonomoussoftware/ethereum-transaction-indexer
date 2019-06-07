'use strict'

const beforeExit = require('before-exit')
const logger = require('../logger')
const MongoClient = require('mongodb').MongoClient

// Create a client that connects to the provided URL
const createClientFor = url =>
  MongoClient.connect(url, { useNewUrlParser: true })

// Initialize all capped collections
const initCollections = dbName => function (client) {
  const db = client.db(dbName)

  // Handle errors
  db.on('error', function (err) {
    logger.error('Mongo error', err)

    const meta = { inner: err, exitCode: 1 }
    const error = Object.assign(new Error('Mongo error'), meta)
    beforeExit.do(() => Promise.reject(error))

    // Can't continue if there is a database error
    process.kill(process.pid, 'SIGINT')
  })

  return Promise.all([
    db.createCollection('bestBlock', { capped: true, size: 1024, max: 1 }),
    db.collection('blocks').createIndex('number', { background: true })
  ])
    .catch(function (err) {
      logger.warn('Could not configure collections: %s', err.message)
    })
    .then(() => client)
}

// Create the Mongo indexer-specific API
const createApi = (dbName, maxBlocks, exposeClient) => function (client) {
  const db = client.db(dbName)

  const api = {
    setBestBlock: data => db.collection('bestBlock')
      .insertOne(data),

    getBestBlock: () => db.collection('bestBlock')
      .findOne({}),

    setBlockAddress: ({ number, addr }) => db.collection('blocks')
      .updateOne(
        { number },
        { $addToSet: { addrs: addr } },
        { upsert: true }
      ).then(() => db.collection('blocks')
        .deleteMany({ number: { $lte: number - maxBlocks } })
      ),

    getBlockAddresses: ({ number }) => db.collection('blocks')
      .findOne({ number })
      .then(block => block ? block.addrs : []),

    deleteBlockAddresses: ({ number }) => db.collection('blocks')
      .updateOne(
        { number },
        { $unset: { addrs: undefined } }
      ),

    setAddressTransaction: ({ addr, number, txid }) =>
      db.collection(addr)
        .insertOne({ number, txid })
        .then(() => db.collection(addr)
          .createIndex('number', { background: true })
        ),

    getAddressTransactions: ({ addr, min, max }) =>
      db.collection(addr)
        .find({ number: { $gte: min, $lte: max } })
        .toArray()
        .then(blocks => blocks.map(block => block.txid)),

    deleteAddressTransaction: ({ addr, txid }) =>
      db.collection(addr)
        .deleteOne({ txid }),

    disconnect: () => client.close()
  }

  if (exposeClient) {
    api.client = client
  }

  return api
}

// Initialize the Mongo client, collections and return the indexer API object
const createClient = ({ url, dbName }, maxBlocks, exposeClient) =>
  createClientFor(url)
    .then(initCollections(dbName))
    .then(createApi(dbName, maxBlocks, exposeClient))

module.exports = createClient
