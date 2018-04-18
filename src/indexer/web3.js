'use strict'

const { enode: { ipcPath } } = require('config')
const net = require('net')
const Web3 = require('web3')

const web3 = new Web3(new Web3.providers.IpcProvider(ipcPath, net))

module.exports = web3
