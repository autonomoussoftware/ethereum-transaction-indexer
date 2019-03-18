'use strict'

const logger = require('../../shared/src/logger')

// eslint-disable-next-line max-len
const NULL_TX_ID = '0x0000000000000000000000000000000000000000000000000000000000000000'

function init (db, pub) {
  const { dbnum } = pub

  // Store ETH transaction data
  const storeEthTransactions = ({ number, data: { addresses, txid } }) =>
    Promise.all(addresses.map(function (addr) {
      logger.verbose('Transaction indexed %s %s', addr, txid)
      return Promise.all([
        db.setAddressTransaction({ addr, number, txid })
          .then(function () {
            logger.verbose('Publishing tx confirmed %s %s', addr, txid)
            return pub.publish(`${dbnum}:tx:${addr}`, `${txid}:confirmed`)
          }),
        db.setBlockAddress({ number, addr })
      ])
    }))

  // Store parsed address to transaction data in the db
  const storeData = ({ number, data }) =>
    Promise.all(data.map(tx => storeEthTransactions({ number, data: tx })))

  // Remove ETH transaction data
  const removeEthTransactions = ({ number }) =>
    db.getBlockAddresses({ number })
      .then(addresses => Promise.all(
        addresses.map(addr => db
          .getAddressTransactions({ addr, min: number, max: number })
          .then(txids => Promise.all(txids.map(function (txid) {
            logger.verbose('Transaction removed %s %s', addr, txid)
            return db.deleteAddressTransaction({ addr, txid })
              .then(function () {
                logger.verbose('Publishing tx unconfirmed %s %s', addr, txid)
                return pub.publish(`${dbnum}:tx:${addr}`, `${txid}:unconfirmed`)
              })
          })))
        )
      ))
      .then(() => db.deleteBlockAddresses({ number }))

  // Remove parsed address to transaction data from the db
  const removeData = ({ number }) => removeEthTransactions({ number })

  // Get the best indexed block
  const getBestBlock = () =>
    db.getBestBlock()
      .then(value => value || {
        number: -1,
        hash: NULL_TX_ID,
        totalDifficulty: '0'
      })

  // Update the record of the best indexed block
  function storeBestBlock ({ number, hash, totalDifficulty }) {
    logger.info('New best block %d %s', number, hash)
    return db.setBestBlock({ number, hash, totalDifficulty })
  }

  const api = {
    getBestBlock,
    removeData,
    storeBestBlock,
    storeData
  }

  return api
}

module.exports = {
  init
}
