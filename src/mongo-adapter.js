'use strict'

const { maxReorgWindow, mongo: { url, dbName } } = require('config')
const MongoClient = require('mongodb').MongoClient

// Keep record of blocks only within the reorg window. Blocks are mined in
// average every 15 seconds.
const MAX_BLOCKS = maxReorgWindow / 15

const createClientFor = () =>
  MongoClient.connect(url, { useNewUrlParser: true })

function initCollections (client) {
  const db = client.db(dbName)
  return Promise.all([
    db.createCollection('bestBlock', {
      capped: true,
      size: 1024,
      max: 1
    })
  ])
    .then(() => client)
}

function createApi (client) {
  const db = client.db(dbName)
  return {
    db: {
      insertBestBlock: data => db.collection('bestBlock')
        .insertOne({ data }),
      findBestBlock: () => db.collection('bestBlock')
        .findOne({})
        .then(best => best && best.data),

      upsertBlock: ({ number, type, addr }) => db.collection('blocks')
        .updateOne(
          { number },
          { $addToSet: { [`${type}Addrs`]: { addr } } },
          { upsert: true }
        ).then(() => db.collection('blocks')
          .deleteMany({ number: { $lte: number - MAX_BLOCKS } })
        ),
      findBlockAddresses: ({ number, type }) => db.collection('blocks')
        .findOne({ number })
        .then(block => block ? block[`${type}Addrs`] : []),
      deleteBlock: ({ number, type }) => db.collection('blocks')
        .updateOne(
          { number },
          { $unset: { [`${type}Addrs`]: undefined } }
        ),

      upsertAddress: ({ type, addr, number, txid }) =>
        db.collection(addr)
          .updateOne(
            { number, type },
            { $set: { txid } },
            { upsert: true }
          ),
      findAddressTransactions: ({ type, addr, min, max }) =>
        db.collection(addr)
          .find({ number: { $gte: min, $lte: max }, type })
          .toArray()
          .then(blocks => blocks.map(block => block.txid)),
      deleteAddressTransaction: ({ type, addr, txid }) =>
        db.collection(addr)
          .deleteOne({ type, txid })
    },
    closeConnection: client.close.bind(client)
  }
}

const createClient = () =>
  createClientFor(url)
    .then(initCollections)
    .then(createApi)

module.exports = createClient
