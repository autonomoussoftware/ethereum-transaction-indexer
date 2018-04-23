'use strict'

const { identity, toLower } = require('lodash')
const promiseAllProps = require('promise-all-props')

const logger = require('../logger')

const web3 = require('./web3')

const DEPLOY_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'

// parse a single transaction
const parseEthTransaction = ({ hash, from, to }) => ({
  addresses: [from, to || DEPLOY_CONTRACT_ADDRESS].map(toLower),
  txid: hash
})

const tokenEventSignatures = [
  // approval
  '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
  // transfer
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
]

const ADDRESS_SIZE = 20
const topicToAddress = topic => `0x${topic.substr(-(ADDRESS_SIZE * 2))}`

// parse a token transaction
function parseTokenTransacion ({ logs, transactionHash }) {
  const tokenLogs = logs.filter(({ topics: [signature] }) =>
    tokenEventSignatures.includes(signature))
  return {
    // eslint-disable-next-line no-unused-vars
    tokens: tokenLogs.map(({ address, topics: [_, from, to] }) => ({
      addresses: [from, to].filter(identity).map(topicToAddress).map(toLower),
      token: toLower(address)
    })),
    txid: transactionHash
  }
}

// parse a single block and return address to transaction data
function parseBlock (hash) {
  logger.verbose('Parsing block', hash)
  return web3.eth.getBlock(hash, true)
    .then(({ transactions }) =>
      Promise.all(transactions.map(transaction =>
        web3.eth.getTransactionReceipt(transaction.hash)
          .then(receipt => promiseAllProps({
            eth: parseEthTransaction(transaction),
            tok: parseTokenTransacion(receipt)
          }))
      ))
    )
}

module.exports = parseBlock
