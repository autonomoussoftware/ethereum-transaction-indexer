'use strict'

const { events: { throttleNewBlocks }, maxReorgWindow } = require('config')
const { map } = require('lodash/fp')
const { throttle } = require('lodash')

const db = require('../db')
const logger = require('../logger')
const pubsub = require('../pubsub')

// eslint-disable-next-line max-len
const NULL_TX_ID = '0x0000000000000000000000000000000000000000000000000000000000000000'

// transform a hex string starting with "0x" into a buffer
const hexToBuffer = hex => Buffer.from(hex.substr(2), 'hex')

// convert a buffer to an hex string, adding the '0x' prefix
const bufferToHex = buf => `0x${buf.toString('hex')}`

// create a pubsub connection
const pub = pubsub()

// closes the pubsub connection
const closePubsub = () => pub.quit()

// store ETH transaction data
const storeEthTransactions = ({ number, data: { addresses, txid } }) =>
  Promise.all(addresses.map(function (addr) {
    logger.verbose('Transaction indexed', addr, number, txid)
    return Promise.all([
      db.zadd(`eth:${addr}`, number, hexToBuffer(txid))
        .then(function () {
          logger.verbose('Publishing tx message', addr, txid)
          return pub.publish(`tx:${addr}`, `eth:${txid}:confirmed`)
        }),
      db.sadd(`blk:${number}:eth`, hexToBuffer(addr))
        .then(() => db.expire(`blk:${number}:eth`, maxReorgWindow))
    ])
  }))

// store token transaction data
const storeTokenTransactions = ({ number, data: { tokens, txid } }) =>
  Promise.all(tokens.map(({ addresses, token }) =>
    Promise.all(addresses.map(function (addr) {
      logger.verbose('Token transaction indexed', addr, token, number, txid)
      return Promise.all([
        db.zadd(`tok:${addr}:${token}`, number, hexToBuffer(txid))
          .then(function () {
            logger.verbose('Publishing tok message', addr, txid)
            return pub.publish(`tx:${addr}`, `tok:${txid}:confirmed:${token}`)
          }),
        db.sadd(`blk:${number}:tok`, hexToBuffer(`${addr}:${token}`))
          .then(() => db.expire(`blk:${number}:tok`, maxReorgWindow))
      ])
    }))
  ))

// remove ETH transaction data
const removeEthTransactions = ({ number }) =>
  db.smembers(`blk:${number}:eth`)
    .then(map(bufferToHex))
    .then(addresses => Promise.all(
      addresses.map(addr => db.zrangebyscore(`eth:${addr}`, number, number)
        .then(map(bufferToHex))
        .then(txids => Promise.all(txids.map(function (txid) {
          logger.verbose('Transaction unconfirmed', addr, txid)
          return db.zrem(`eth:${addr}`, hexToBuffer(txid))
            .then(function () {
              logger.verbose('Publishing tx unconfirmed message', addr, txid)
              return pub.publish(`tx:${addr}`, `eth:${txid}:unconfirmed`)
            })
        })))
      )
    ))
    .then(() => db.del(`blk:${number}:eth`))

// remove token transaction data
const removeTokenTransactions = ({ number }) =>
  db.smembers(`blk:${number}:tok`)
    .then(map(bufferToHex))
    .then(addrTokens => Promise.all(
      addrTokens.map(function (addrToken) {
        const [addr, token] = addrToken.split(':')
        return db.zrangebyscore(`tok:${addr}:${token}`, number, number)
          .then(map(hexToBuffer))
          .then(txids => Promise.all(txids.map(function (txid) {
            logger.verbose('Token transaction unconfirmed', addr, token, txid)
            return db.zrem(`tok:${addr}:${token}`, hexToBuffer(txid))
              .then(function () {
                logger.verbose('Publishing tok unconfirmed message', addr, txid)
                return pub.publish(
                  `tx:${addr}`, `tok:${txid}:unconfirmed:${token}`
                )
              })
          })))
      })
    ))
    .then(() => db.del(`blk:${number}:tok`))

// get the best indexed block
const getBestBlock = () =>
  db.get('best-block')
    .then(value => value
      ? JSON.parse(value.toString())
      : {
        number: -1,
        hash: NULL_TX_ID,
        totalDifficulty: '0'
      }
    )

// update the record of the best indexed block
const publishBestBlock = throttle(
  (hash, number) => pub.publish('block', `${hash}:${number}`),
  throttleNewBlocks
)
function storeBestBlock ({ number, hash, totalDifficulty }) {
  logger.verbose('New best block', number, hash, totalDifficulty)
  return db.set('best-block', JSON.stringify({ number, hash, totalDifficulty }))
    .then(function () {
      logger.verbose('Publishing new block', number, hash)
      return publishBestBlock(hash, number)
    })
}

// store parsed address to transaction data in the db
const storeData = ({ number, data }) =>
  Promise.all(data.map(({ eth, tok }) =>
    Promise.all([
      storeEthTransactions({ number, data: eth }),
      storeTokenTransactions({ number, data: tok })
    ]))
  )

// remove parsed address to transaction data from the db
const removeData = ({ number }) =>
  Promise.all([
    removeEthTransactions({ number }),
    removeTokenTransactions({ number })
  ])

module.exports = {
  closePubsub,
  getBestBlock,
  removeData,
  storeBestBlock,
  storeData
}
