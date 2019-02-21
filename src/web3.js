'use strict'

const { enode: { ipcPath, wsPath } } = require('config')
const net = require('net')
const Web3 = require('web3')

const provider = ipcPath
  ? new Web3.providers.IpcProvider(ipcPath, net)
  : new Web3.providers.WebsocketProvider(wsPath, { autoReconnect: true })

const web3 = new Web3(provider)

module.exports = web3
