'use strict'

const { defaultToken } = require('config')
// eslint-disable-next-line no-shadow
const { map, toString } = require('lodash/fp')
const { merge, reduce } = require('lodash')
const promiseAllProps = require('promise-all-props')

const db = require('../db')

// convert a buffer to an hex string, adding the '0x' prefix
const bufferToHex = buf => `0x${buf.toString('hex')}`

// get best block from db and parse the string
const getBestBlock = () => db.get('best-block').then(toString).then(JSON.parse)

// get only the best block number
const getBestBlockNumber = () => getBestBlock().then(b => b.number)

// get all ETH transactions of an address
const getAddressTransactions = ({ address, from, to }) => promiseAllProps({
  min: from || 0,
  max: to || getBestBlockNumber()
})
  .then(({ min, max }) => db.zrangebyscore(`eth:${address}`, min, max))
  .then(map(bufferToHex))

// get all transactions with token logs for an address
const getAddressTokenTransactions = ({ address, from, to, tokens }) =>
  promiseAllProps({
    min: from || 0,
    max: to || getBestBlockNumber(),
    sets: tokens && tokens.length
      ? tokens.map(t => `tok:${address}:${t}`)
      : [`tok:${address}:${defaultToken.toLowerCase()}`]
  })
    .then(({ min, max, sets }) =>
      Promise.all(sets.map(set =>
        db.zrangebyscore(set, min, max)
          .then(map(bufferToHex))
          .then(transactions => ({ [set.split(':')[2]]: transactions }))
      ))
    )
    .then(results => reduce(results, merge, {}))

module.exports = {
  getBestBlock,
  getBestBlockNumber,
  getAddressTransactions,
  getAddressTokenTransactions
}
