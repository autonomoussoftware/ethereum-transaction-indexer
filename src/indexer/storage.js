'use strict'

const db = require('../db')
const logger = require('../logger')

// eslint-disable-next-line max-len
const NULL_TX_ID = '0x0000000000000000000000000000000000000000000000000000000000000000'

const pub = db.pubsub()

// closes the pubsub connection
const closePubsub = () => pub.quit()

// store ETH transaction data
const storeEthTransactions = ({ number, data: { addresses, txid } }) =>
  Promise.all(addresses.map(function (address) {
    logger.info('Transaction indexed', address, number, txid)
    return db.zadd(`eth:${address}`, number, txid)
      .then(function () {
        logger.verbose('Publishing tx message', address, txid)
        return pub.publish(`tx:${address}`, `eth:${txid}:confirmed`)
      })
  }))

// store token transaction data
const storeTokenTransactions = ({ number, data: { tokens, txid } }) =>
  Promise.all(tokens.map(({ addresses, token }) =>
    Promise.all(addresses.map(function (address) {
      logger.info('Token transaction indexed', address, token, number, txid)
      return db.zadd(`tok:${address}:${token}`, number, txid)
        .then(function () {
          logger.verbose('Publishing tok message', address, txid)
          return pub.publish(`tx:${address}`, `tok:${txid}:confirmed:${token}`)
        })
    }))
  ))

// remove ETH transaction data
const removeEthTransactions = ({ data: { addresses, txid } }) =>
  Promise.all(addresses.map(function (address) {
    logger.info('Transaction unconfirmed', address, txid)
    return db.zrem(`eth:${address}`, txid)
      .then(function () {
        logger.verbose('Publishing tx unconfirmed message', address, txid)
        return pub.publish(`tx:${address}`, `eht:${txid}:unconfirmed`)
      })
  }))

// remove token transaction data
const removeTokenTransactions = ({ data: { tokens, txid } }) =>
  Promise.all(tokens.map(({ addresses, token }) =>
    Promise.all(addresses.map(function (address) {
      logger.info('Token transaction unconfirmed', address, token, txid)
      return db.zrem(`tok:${address}:${token}`, txid)
        .then(function () {
          logger.verbose('Publishing tok unconfirmed message', address, txid)
          return pub.publish(
            `tx:${address}`, `tok:${txid}:unconfirmed:${token}`
          )
        })
    }))
  ))

// get the best indexed block
const getBestBlock = () =>
  db.get('best-block')
    .then(value =>
      JSON.parse(value) || ({
        number: -1,
        hash: NULL_TX_ID,
        totalDifficulty: '0'
      })
    )

// update the record of the best indexed block
function storeBestBlock ({ number, hash, totalDifficulty }) {
  logger.info('New best block', number, hash, totalDifficulty)
  return db.set('best-block', JSON.stringify({ number, hash, totalDifficulty }))
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
const removeData = ({ data }) =>
  Promise.all(data.map(({ eth, tok }) =>
    Promise.all([
      removeEthTransactions({ data: eth }),
      removeTokenTransactions({ data: tok })
    ]))
  )

module.exports = {
  closePubsub,
  getBestBlock,
  removeData,
  storeBestBlock,
  storeData
}
