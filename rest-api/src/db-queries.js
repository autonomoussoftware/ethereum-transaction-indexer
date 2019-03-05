'use strict'

const { get } = require('lodash/fp')
const promiseAllProps = require('promise-all-props')

function createQueries (db) {
  // Get best block from db and parse the string
  const getBestBlock = () => db.getBestBlock()

  // Get all ETH transactions of an address
  const getAddressTransactions = ({ address, from, to }) =>
    promiseAllProps({
      min: from || 0,
      max: to || db.getBestBlock().then(get('number'))
    })
      .then(({ min, max }) =>
        db.getAddressTransactions({ addr: address, min, max })
      )

  return {
    getAddressTransactions,
    getBestBlock
  }
}

module.exports = createQueries
