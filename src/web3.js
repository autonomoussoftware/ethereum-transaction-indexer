'use strict'

const { enode: { ipcPath, wsPath } } = require('config')
const net = require('net')
const Web3 = require('web3')

const web3 = new Web3(
  ipcPath
    ? new Web3.providers.IpcProvider(ipcPath, net)
    : wsPath
)

module.exports = web3
