'use strict'

const { merge, reduce } = require('lodash')
const promiseAllProps = require('promise-all-props')

const db = require('../db')

const getBestBlock = () => db.get('best-block').then(JSON.parse)

const getBestBlockNumber = () => getBestBlock().then(b => b.number)

const getAddressTransactions = ({ address, from, to }) => promiseAllProps({
  min: from || 0,
  max: to || getBestBlockNumber()
})
  .then(({ min, max }) => db.zrangebyscore(`eth:${address}`, min, max))

const getAddressTokenTransactions = ({ address, from, to, tokens }) =>
  promiseAllProps({
    min: from || 0,
    max: to || getBestBlockNumber(),
    sets: tokens && tokens.length
      ? tokens.map(t => `tok:${address}:${t}`)
      : db.keys(`tok:${address}:*`)
  })
    .then(({ min, max, sets }) =>
      Promise.all(sets.map(set =>
        db.zrangebyscore(set, min, max)
          .then(transactions => ({ [set.split(':')[2]]: transactions }))
      ))
    )
    .then(results => reduce(results, merge))

module.exports = {
  getBestBlock,
  getBestBlockNumber,
  getAddressTransactions,
  getAddressTokenTransactions
}
