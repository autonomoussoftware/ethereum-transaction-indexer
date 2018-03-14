'use strict'

const { jsonRpcApiUrl } = require('config')
const Web3 = require('web3')

const web3 = new Web3(new Web3.providers.HttpProvider(jsonRpcApiUrl))

module.exports = web3
