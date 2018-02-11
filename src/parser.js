const { http: web3 } = require('./web3')
const debug = require('debug')('parser')

const DEPLOY_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'

// parse a single transaction
function parseTransaction ({ hash, from, to }) {
  return {
    hash,
    addresses: [from, to || DEPLOY_CONTRACT_ADDRESS]
  }
}

// parse a single block and return address to transaction data
function parseBlock (number) {
  debug('parseBlock', number)
  return web3.eth.getBlock(number, true)
    .then(function ({ transactions }) {
      return Promise.all(transactions.map(function (transaction) {
        return parseTransaction(transaction)
      }))
    })
}

module.exports = {
  parseBlock
}
