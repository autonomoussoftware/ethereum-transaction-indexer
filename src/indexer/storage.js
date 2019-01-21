'use strict'

const { pubsub, redis: { url } } = require('config')
const { throttle } = require('lodash')

const logger = require('../logger')
const getPubSub = require('../pubsub')

// eslint-disable-next-line max-len
const NULL_TX_ID = '0x0000000000000000000000000000000000000000000000000000000000000000'

// Global reference to the database API
let db

// Sets the database reference
function setDb (ref) {
  db = ref
}

// create a pubsub connection
const pub = getPubSub(pubsub === 'redis' && url)

// closes the pubsub connection
const closePubsub = () => pub.quit()

// store ETH transaction data
const storeEthTransactions = ({ number, data: { addresses, txid } }) =>
  Promise.all(addresses.map(function (addr) {
    logger.verbose('Transaction indexed', addr, number, txid)
    return Promise.all([
      db.setAddressTransaction({ addr, number, txid })
        .then(function () {
          logger.verbose('Publishing tx message', addr, txid)
          return pub.publish(`tx:${addr}`, `${txid}:confirmed`)
        }),
      db.setBlockAddress({ number, addr })
    ])
  }))

// remove ETH transaction data
const removeEthTransactions = ({ number }) =>
  db.getBlockAddresses({ number })
    .then(addresses => Promise.all(
      addresses.map(addr => db
        .getAddressTransactions({ addr, min: number, max: number })
        .then(txids => Promise.all(txids.map(function (txid) {
          logger.verbose('Transaction unconfirmed', addr, txid)
          return db.deleteAddressTransaction({ addr, txid })
            .then(function () {
              logger.verbose('Publishing tx unconfirmed message', addr, txid)
              return pub.publish(`tx:${addr}`, `${txid}:unconfirmed`)
            })
        })))
      )
    ))
    .then(() => db.deleteBlockAddresses({ number }))

// get the best indexed block
const getBestBlock = () =>
  db.getBestBlock()
    .then(value => value || {
      number: -1,
      hash: NULL_TX_ID,
      totalDifficulty: '0'
    })

// throttle block events during sync
const publishBestBlock = throttle(
  (hash, number) => pub.publish('block', `${hash}:${number}`),
  1000
)

// update the record of the best indexed block
function storeBestBlock ({ number, hash, totalDifficulty }) {
  logger.info('New best block', number, hash)
  return db.setBestBlock({ number, hash, totalDifficulty })
    .then(function () {
      logger.verbose('Publishing new block', number, hash)
      return publishBestBlock(hash, number)
    })
}

// store parsed address to transaction data in the db
const storeData = ({ number, data }) =>
  Promise.all(data.map(tx => storeEthTransactions({ number, data: tx })))

// remove parsed address to transaction data from the db
const removeData = ({ number }) => removeEthTransactions({ number })

module.exports = {
  closePubsub,
  getBestBlock,
  removeData,
  setDb,
  storeBestBlock,
  storeData
}
