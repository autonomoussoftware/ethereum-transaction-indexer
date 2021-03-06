'use strict'

const net = require('net')
const Web3 = require('web3')

function getWeb3 (config) {
  const { enode: { ipcPath, wsPath } } = config

  const provider = ipcPath
    ? new Web3.providers.IpcProvider(ipcPath, net)
    : new Web3.providers.WebsocketProvider(wsPath, { autoReconnect: true })

  const web3 = new Web3(provider)

  return web3
}

module.exports = getWeb3
