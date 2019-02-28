'use strict'

const getWeb3 = require('../../shared/web3')
const createDbClient = require('../../shared/db')

const storage = require('./storage')
const startIndexer = require('./indexer')
const createPub = require('./pub')

// Start indexing
const start = config =>
  Promise.all([createDbClient(config), createPub(config)])
    .then(([db, pub]) =>
      startIndexer(config, getWeb3(config), storage.init(db, pub))
    )

// Gracefully stop
// TODO close db, pubsub and web3 connections
const stop = () => undefined

module.exports = {
  start,
  stop
}
