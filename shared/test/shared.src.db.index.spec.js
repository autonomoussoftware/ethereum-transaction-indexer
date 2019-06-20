'use strict'

const { promisify } = require('util')
const chai = require('chai')
const deepEqualInAnyOrder = require('deep-equal-in-any-order')
const proxyquire = require('proxyquire').noCallThru()
require('promise-prototype-finally')

chai.use(deepEqualInAnyOrder).should()

const createClient = proxyquire('../src/db', {
  './mongo': proxyquire('../src/db/mongo', {
    mongodb: require('mongo-mock')
  }),
  './redis': proxyquire('../src/db/redis', {
    redis: require('redis-mock')
  })
})

describe('Storage', function () {
  it('should store different tx for same address on Redis', function () {
    const config = {
      dbEngine: 'redis',
      maxReorgWindow: 28800,
      redis: { url: 'redis://localhost:6379' }
    }
    return createClient(config, true).then(function (db) {
      return promisify(db.client.zremrangebyscore.bind(db.client))(
        '0x01',
        1,
        2
      ).then(function () {
        return Promise.all([
          db.setAddressTransaction({ addr: '0x01', number: 1, txid: '0x01' }),
          db.setAddressTransaction({ addr: '0x01', number: 1, txid: '0x02' }),
          db.setAddressTransaction({ addr: '0x01', number: 2, txid: '0x03' }),
          db.setAddressTransaction({ addr: '0x01', number: 2, txid: '0x04' })
        ])
          .then(function () {
            return db.getAddressTransactions({ addr: '0x01', min: 1, max: 2 })
          })
          .then(function (transactions) {
            transactions.should.deep.equalInAnyOrder([
              '0x01',
              '0x02',
              '0x03',
              '0x04'
            ])
          })
          .finally(function () {
            return db.disconnect()
          })
      })
    })
  })

  it('should store different tx for same address on Mongo', function () {
    const config = {
      dbEngine: 'mongo',
      maxReorgWindow: 28800,
      mongo: { url: 'mongodb://localhost:27017/', dbName: 'indexer-test' }
    }
    return createClient(config, true).then(function (db) {
      return db.client
        .db(config.mongo.dbName)
        .collection('0x01')
        .deleteMany({})
        .then(function () {
          return Promise.all([
            db.setAddressTransaction({ addr: '0x01', number: 1, txid: '0x01' }),
            db.setAddressTransaction({ addr: '0x01', number: 1, txid: '0x02' }),
            db.setAddressTransaction({ addr: '0x01', number: 2, txid: '0x03' }),
            db.setAddressTransaction({ addr: '0x01', number: 2, txid: '0x04' })
          ])
            .then(function () {
              return db.getAddressTransactions({ addr: '0x01', min: 1, max: 2 })
            })
            .then(function (transactions) {
              transactions.should.deep.equalInAnyOrder([
                '0x01',
                '0x02',
                '0x03',
                '0x04'
              ])
            })
            .finally(function () {
              return db.disconnect()
            })
        })
    })
  })
})
