'use strict'

const { toLower } = require('lodash')

const logger = require('../logger')
const web3 = require('../web3')

const DEPLOY_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'

// parse a single transaction
const parseEthTransaction = ({ hash, from, to }) => ({
  addresses: [from, to || DEPLOY_CONTRACT_ADDRESS].map(toLower),
  txid: hash
})

// parse a single block and return address to transaction data
function parseBlock (hash) {
  logger.verbose('Parsing block', hash)
  return web3.eth.getBlock(hash, true)
    .then(({ transactions }) =>
      Promise.all(transactions.map(transaction =>
        parseEthTransaction(transaction)
      ))
    )
}

module.exports = parseBlock
