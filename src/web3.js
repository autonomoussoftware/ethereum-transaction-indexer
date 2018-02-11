const { jsonRpcApiUrl, websocketApiUrl } = require('config')
const Web3 = require('web3')

function memoize (fn) {
  let result
  return function () {
    if (!result) {
      result = fn()
    }
    return result
  }
}

const getHttp = memoize(() => new Web3(new Web3.providers.HttpProvider(jsonRpcApiUrl)))
const getWs = memoize(() => new Web3(new Web3.providers.WebsocketProvider(websocketApiUrl)))

module.exports = {
  get http () { return getHttp() },
  get ws () { return getWs() }
}
