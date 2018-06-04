'use strict'

const { defaultToken } = require('config')
const { merge, reduce } = require('lodash')
const promiseAllProps = require('promise-all-props')

const db = require('../db')

// get best block from db and parse the string
const getBestBlock = () => db.getBestBlock()

// get only the best block number
const getBestBlockNumber = () => db.getBestBlock().then(b => b.number)

// get all ETH transactions of an address
const getAddressTransactions = ({ address, from, to }) => promiseAllProps({
  min: from || 0,
  max: to || getBestBlockNumber()
})
  .then(({ min, max }) =>
    db.getAddressTransactions({ type: 'eth', addr: address, min, max })
  )

// get all transactions with token logs for an address
const getAddressTokenTransactions = ({ address: addr, from, to, tokens }) =>
  promiseAllProps({
    min: from || 0,
    max: to || getBestBlockNumber(),
    sets: tokens && tokens.length
      ? tokens.map(t => `tok:${addr}:${t}`)
      : [`tok:${addr}:${defaultToken.toLowerCase()}`]
  })
    .then(({ min, max, tokensList }) =>
      Promise.all(tokensList.map(token =>
        db.getAddressTransactions({ type: 'tok', addr, token, min, max })
          .then(transactions => ({ [token]: transactions }))
      ))
    )
    .then(results => reduce(results, merge, {}))

module.exports = {
  getBestBlock,
  getBestBlockNumber,
  getAddressTransactions,
  getAddressTokenTransactions
}
