'use strict'

const createCalculateNextBlock = require('../lib/@bloq/next-block/src')

function createNext (getBlock, BN) {
  // Crete the function to get the next ETH block
  const calculateNextBlock = createCalculateNextBlock({
    getBlock: hash =>
      getBlock(hash)
        .then(header =>
          Object.assign(header, { previousHash: header.parentHash })
        ),
    compareBlocks: (headerA, headerB) =>
      new BN(headerA.totalDifficulty).cmp(new BN(headerB.totalDifficulty))
  })

  // Calculate next ETH block starting at `from` to reach `to`
  function calculateNextEthBlock (from, to) {
    return calculateNextBlock(to.hash, from.hash)
  }

  return calculateNextEthBlock
}

module.exports = createNext
