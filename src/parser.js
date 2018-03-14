const debug = require('debug')('eis.parser')
const promiseAllProps = require('promise-all-props')

const toLowerCase = require('../lib/to-lowercase')

const web3 = require('./web3')

const DEPLOY_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'

// parse a single transaction
function parseEthTransaction ({ hash, from, to }) {
  return {
    addresses: [from, to || DEPLOY_CONTRACT_ADDRESS].map(toLowerCase),
    txid: hash
  }
}

const tokenEventSignatures = [
  '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925', // approval
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // transfer
]

const topicToAddress = topic => `0x${topic.substr(-40)}`

// parse a token transaction
function parseTokenTransacion ({ logs, transactionHash }) {
  const tokenLogs = logs.filter(({ topics: [signature] }) =>
    tokenEventSignatures.includes(signature))
  return {
    tokens: tokenLogs.map(function ({ address, topics: [_, from, to] }) {
      return {
        addresses: [from, to].map(topicToAddress).map(toLowerCase),
        token: toLowerCase(address)
      }
    }),
    txid: transactionHash
  }
}

// parse a single block and return address to transaction data
function parseBlock (number) {
  debug('Parsing block', number)
  return web3.eth.getBlock(number, true)
    .then(function ({ transactions }) {
      return Promise.all(transactions.map(function (transaction) {
        return web3.eth.getTransactionReceipt(transaction.hash)
          .then(function (receipt) {
            return promiseAllProps({
              eth: parseEthTransaction(transaction),
              tok: parseTokenTransacion(receipt)
            })
          })
      }))
    })
}

module.exports = { parseBlock }
