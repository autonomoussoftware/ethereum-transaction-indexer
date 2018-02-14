const { jsonRpcApiUrl, websocketApiUrl } = require('config')
const Web3 = require('web3')

const web3 = new Web3(new Web3.providers.HttpProvider(jsonRpcApiUrl))

const createWsWeb3 = () =>
  new Web3(new Web3.providers.WebsocketProvider(websocketApiUrl))

Object.defineProperty(web3, 'ws', { get: createWsWeb3 })

module.exports = web3
