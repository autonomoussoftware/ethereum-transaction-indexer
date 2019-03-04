'use strict'

const { BN } = require('web3-utils')
const { get } = require('lodash/fp')
const { toLower } = require('lodash')
const { spy } = require('sinon')
const memoize = require('p-memoize')
const notIfBusy = require('promise-not-if-busy')
const promiseAllProps = require('promise-all-props')

const logger = require('../../shared/src/logger')

const createNext = require('./next')

const DEPLOY_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'

function start (config, web3, storage) {
  const {
    getBestBlock,
    removeData,
    storeBestBlock,
    storeData
  } = storage
  const { blocksCacheAge, indexingConcurrency, syncTimerSec } = config

  // Optimized version of `getBlock()`
  const getBlock = memoize(web3.eth.getBlock, { maxAge: blocksCacheAge })

  // Parse a single transaction
  const parseEthTransaction = ({ hash, from, to }) => ({
    addresses: [from, to || DEPLOY_CONTRACT_ADDRESS].map(toLower),
    txid: hash
  })

  // Parse all block transactions
  const parseTransactions = ({ transactions }) =>
    Promise.all(transactions.map(transaction =>
      parseEthTransaction(transaction)
    ))

  // Spied version of storeBestBlock
  const spiedStoreBestBlock = spy(storeBestBlock)

  // Index a single block and store indexed information
  const indexBlock = header =>
    getBlock(header.hash, true)
      .then(parseTransactions)
      .then(data => storeData({ number: header.number, data }))

  // Remove a single block from storage
  const removeBlock = hash =>
    getBlock(hash)
      .then(header => removeData(header))

  // Index as if the latest block is the given block number
  const indexBlockNumber = number =>
    getBlock(number)
      .then(header => indexBlock(header))

  // Adaptative batch length for past blocks indexing
  let batchLenght = indexingConcurrency

  // Recursively index the next blocks on top of best
  function indexNextToBestBlock () {
    logger.debug('Indexing batch of %d blocks', batchLenght)

    return promiseAllProps({
      latest: getBlock('latest'),
      best: getBestBlock()
    })
      .then(function ({ latest, best }) {
        if (best.number >= latest.number) {
          return Promise.resolve()
        }

        logger.info('Sync progress %d', (best.number / latest.number).toFixed(6))

        const batch = new Array(batchLenght)
          .fill()
          .map((_, i) => best.number + 1 + i)
          .filter(number => number <= latest.number)
          .map(number => getBlock(number)
            .then(header => indexBlockNumber(number)
              .then(() => header)
            )
          )

        return Promise.all(batch)
          .then(headers => spiedStoreBestBlock(headers[headers.length - 1]))
          .then(() => indexNextToBestBlock())
      })
  }

  // Index all existing blocks in the blockchain from best to latest
  function indexPastBlocks () {
    logger.info('Indexing past blocks')

    // Last batch indexing speed in blocks/sec
    let lastSpeed = 0

    const interval = setInterval(function () {
      const calls = spiedStoreBestBlock.callCount
      if (calls) {
        const { number } = spiedStoreBestBlock.lastCall.args[0]

        const speed = Math.round(calls * batchLenght * 1000 / syncTimerSec)
        batchLenght = Math.round(batchLenght * (speed > lastSpeed ? 1.3 : 0.9))
        lastSpeed = Math.round(0.6 * lastSpeed + 0.4 * speed)

        logger.info('Parsed block %d at %d blocks/sec', number, speed)
      }
      spiedStoreBestBlock.resetHistory()
    }, syncTimerSec)

    return indexNextToBestBlock()
      .then(function () {
        clearInterval(interval)
      })
  }

  // Calculate the next block to process
  const calculateNextBlock = createNext(getBlock, BN)

  // Import up to the incoming block, one at a time considering reorgs
  function indexBlocks (latest) {
    logger.verbose('Indexing incoming blocks %d %s', latest.number, latest.hash)
    return getBestBlock()
      .then(function (best) {
        return calculateNextBlock(best, latest)
          .then(function ({ next, undo }) {
            if (next) {
              // going up!
              logger.verbose('Parsing block %s', next)
              return getBlock(next)
                .then(nextHeader => indexBlock(nextHeader)
                  .then(() => spiedStoreBestBlock(nextHeader))
                )
                .then(() => indexBlocks(latest))
            }

            if (undo) {
              // need to go back :(
              logger.warn('Removing reorg\'d block %s', undo)
              return removeBlock(undo)
                .then(() => getBlock(undo))
                .then(bestHeader => getBlock(bestHeader.parentHash))
                .then(spiedStoreBestBlock)
                .then(() => indexBlocks(latest))
            }

            logger.verbose('Index up to date')
            return Promise.resolve()
          })
      })
  }

  // Wrapped version of `indexBlocks()` to avoid concurrent calls
  const tryIndexBlocks = notIfBusy(indexBlocks)

  // Start listening for new blocks and index on new incoming
  function indexIncomingBlocks () {
    logger.info('Starting block listener')

    web3.eth.subscribe('newBlockHeaders')
      .on('data', function (header) {
        logger.info('New block received %d %s', header.number, header.hash)

        tryIndexBlocks(header)
          .catch(function (err) {
            logger.warn('Could not index new block %s', err.message)
            logger.debug(err.stack)
          })
      })
      .on('error', function (err) {
        logger.warn('Subscription failure %s', err.message)
      })
  }

  return indexPastBlocks()
    .then(() => indexIncomingBlocks())
}

module.exports = start
