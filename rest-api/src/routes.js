'use strict'

const Router = require('restify-router').Router

const createGetBestBlock = require('../functions/get-best-block').create
const createGetAddrTxs = require('../functions/get-address-transactions').create

const ETH_ADDRESS = '^0x[0-9a-fA-F]{40}$'

function createRouter (db) {
  const router = new Router()

  router.get(
    '/blocks/best',
    createGetBestBlock(db)
  )
  router.get(
    `/addresses/:address(${ETH_ADDRESS})/transactions`,
    createGetAddrTxs(db)
  )

  return router
}

module.exports = createRouter
