'use strict'

const { toLower } = require('lodash')
const { spy } = require('sinon')
const memoize = require('p-memoize')
const notIfBusy = require('promise-not-if-busy')
const promiseAllProps = require('promise-all-props')

const logger = require('../../shared/logger')

const createNext = require('./next')

const DEPLOY_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'

function start (config, web3, storage) {
  const {
    getBestBlock,
    removeData,
    storeBestBlock,
    storeData
  } = storage
  const { blocksCacheAge, syncTimerSec } = config

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
      .then(header => indexBlock(header)
        .then(() => spiedStoreBestBlock(header))
      )

  // Recursively index the next block on top of best
  // TODO parallelize blocks processing in batches
  const indexNextToBestBlock = () =>
    promiseAllProps({
      latest: getBlock('latest'),
      best: getBestBlock()
    })
      .then(({ latest, best }) =>
        best.hash === latest.hash ||
        indexBlockNumber(best.number + 1)
          .then(indexNextToBestBlock)
      )

  // Index all existing blocks in the blockchain from best to latest
  function indexPastBlocks () {
    logger.info('Indexing past blocks')

    const interval = setInterval(function () {
      const calls = spiedStoreBestBlock.callCount
      if (calls) {
        const { number } = spiedStoreBestBlock.lastCall.args[0]
        logger.info(
          'Parsed block %s at %s blocks/sec',
          number,
          Math.round(calls * 1000 / syncTimerSec)
        )
      }
      spiedStoreBestBlock.resetHistory()
    }, syncTimerSec)

    return indexNextToBestBlock()
      .then(function () {
        clearInterval(interval)
      })
  }

  // Calculate the next block to process
  const calculateNextBlock = createNext(getBlock, web3.utils.BN)

  // Import up to the incoming block, one at a time considering reorgs
  function indexBlocks (latest) {
    logger.verbose('Indexing incoming blocks', latest.number, latest.hash)
    return getBestBlock()
      .then(function (best) {
        return calculateNextBlock(best, latest)
          .then(function ({ next, undo }) {
            if (next) {
              // going up!
              logger.verbose('Parsing block', next)
              return getBlock(next)
                .then(nextBlock => indexBlock(nextBlock)
                  .then(() => spiedStoreBestBlock(nextBlock))
                )
                .then(() => indexBlocks(latest))
            }

            if (undo) {
              // need to go back :(
              logger.warn('Removing reorg\'d block', undo)
              return removeBlock(best.hash)
                .then(() => getBlock(best.parentHash))
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
        logger.info('New block received', header.number, header.hash)

        tryIndexBlocks(header)
          .catch(function (err) {
            logger.warn('Could not index new block', err.message)
            logger.debug(err.stack)
          })
      })
      .on('error', function (err) {
        logger.warn('Subscription failure', err.message)
      })
  }

  return indexPastBlocks()
    .then(() => indexIncomingBlocks())
}

module.exports = start
