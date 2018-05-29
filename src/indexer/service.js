'use strict'

const {
  enode: { wsApiUrl },
  pauseOnError,
  subscriptionTimeout
} = require('config')
const beforeExit = require('before-exit')
const memoize = require('p-memoize')
const promiseAllProps = require('promise-all-props')
const util = require('util')

const callsPerSec = require('../../lib/calls-per-sec')
const debounce = require('../../lib/promise-lead-debounce')
const inBN = require('../../lib/in-BN')
const { subscribe } = require('../../lib/web3-block-subscribe')

const logger = require('../logger')

const {
  closePubsub,
  getBestBlock,
  removeData,
  storeBestBlock,
  storeData
} = require('./storage')
const calculateNextBlock = require('./next')
const parseBlock = require('./parser')
const web3 = require('./web3')

const asyncSetTimeout = util.promisify(setTimeout)

// index a single block and store indexed information
const indexBlock = ({ number, hash }) =>
  parseBlock(hash)
    .then(data => storeData({ number, data }))

// get the previous block of a given one
const previousBlock = ({ hash }) =>
  web3.eth.getBlock(hash)
    .then(({ parentHash }) => web3.eth.getBlock(parentHash))

// check if a is less that or equal to b
const lte = (a, b) => inBN('lte', a, b)

// create a spied storeBestBlock to log calls rate
const timedStoreBestBlock = callsPerSec(
  storeBestBlock,
  function (speed, [{ number } = {}]) {
    logger.info('Parsed block %s at %s [blocks/sec]', number, speed)
  }
)

// index a single block considering reorgs
function indexBlocks (latest) {
  logger.verbose('Indexing up to block', latest.number, latest.hash)
  return getBestBlock()
    .then(function (best) {
      if (latest.hash === best.hash) {
        logger.verbose('Block already indexed', latest.hash)
        return true
      }
      if (lte(latest.totalDifficulty, best.totalDifficulty)) {
        logger.verbose('Not indexing lower difficulty block', latest.hash)
        return false
      }

      return calculateNextBlock(best, latest)
        .then(function (next) {
          // going up!
          if (next.parentHash === best.hash) {
            return indexBlock(next)
              .then(() => next)
          }

          // need to go back :(
          logger.warn('Reorg spotted')
          return removeData(best)
            .then(() => previousBlock(best))
        })
        .then(timedStoreBestBlock)
        .then(() => indexBlocks(latest))
    })
}

// index as if the latest block is the given block number
const indexBlockNumber = number =>
  web3.eth.getBlock(number)
    .then(indexBlocks)

// optimized version of `getBlock('latest')`
const CACHE_AGE = 1000
const getLatestBlock = memoize(
  () => web3.eth.getBlock('latest'),
  { maxAge: CACHE_AGE }
)

// recursively index the next block on top of best
const indexNextBlock = () =>
  promiseAllProps({
    latest: getLatestBlock(),
    best: getBestBlock()
  })
    .then(({ latest, best }) =>
      best.hash === latest.hash ||
          indexBlockNumber(best.number + 1)
            .then(indexNextBlock)
    )

// index all existing blocks in the blockchain from best to current
function indexPastBlocks () {
  logger.info('Indexing past blocks')
  return indexNextBlock()
    .catch(function (err) {
      logger.warn('Could not index past block', err)
      return asyncSetTimeout(pauseOnError)
        .then(() => indexPastBlocks())
    })
}

// start listening for new blocks and index on new incoming
function indexIncomingBlocks () {
  logger.info('Starting block listener')

  timedStoreBestBlock.stop()

  subscribe({
    url: wsApiUrl,
    onData: debounce(function (header) {
      logger.info('New block received', header.number, header.hash)

      return web3.eth.getBlock(header.hash)
        .then(indexBlocks)
        .catch(function (err) {
          logger.warn('Could not index new block', err.message)
        })
    }),
    onError (err) {
      logger.warn('Subscription failure', err.message)
    },
    timeout: subscriptionTimeout
  })
}

// start indexing
function start () {
  beforeExit.do(function (signal) {
    logger.error('Shutting down indexer on signal', signal)

    return closePubsub()
  })

  return indexPastBlocks()
    .then(indexIncomingBlocks)
}

module.exports = { start }
