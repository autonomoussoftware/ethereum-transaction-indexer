'use strict'

// Recursively populate the tree of blocks with the given block
// Returns true when done
function populateTree (state, getBlock, hash) {
  return Promise.resolve(getBlock(hash))
    .then(function (block) {
      const { previousHash } = block

      // Mark the root if current block was already populated
      if (state.tree[hash]) {
        state.tree[hash].root = true
        state.completed = true
        return Promise.resolve(true)
      }

      // Create current block in the tree
      state.tree[hash] = { previousHash }

      // Mark the root if current block is the genesis
      if (!previousHash) {
        state.tree[hash].root = true
        state.completed = true
        return Promise.resolve(true)
      }

      // Mark the root if previous is walready populated
      if (state.tree[previousHash]) {
        state.tree[previousHash].root = true
        state.completed = true
        return Promise.resolve(true)
      }

      // Return if already completed
      if (state.completed) {
        return Promise.resolve(true)
      }

      // Recurse to populate the previous block into the tree
      return populateTree(state, getBlock, previousHash)
    })
}

// Create a tree of blocks from hashes A and B to their common parent block
// Returns the populated tree
function generateTree (getBlock, hashA, hashB) {
  const state = { tree: {} }

  const populateBranchA = hashA && populateTree(state, getBlock, hashA)
  const populateBranchB = populateTree(state, getBlock, hashB)

  return Promise.all([populateBranchA, populateBranchB])
    .then(() => state.tree)
}

// Given a tree of blocks, find how to go from the given hash to the root
// Returns the path of hashes
function findPath (tree, hash, keepRoot) {
  const list = [ hash ]
  let current = hash

  while (!tree[current].root) {
    const previousHash = tree[current].previousHash
    list.push(previousHash)
    current = previousHash
  }
  if (!keepRoot) {
    list.pop()
  }

  return list
}

/**
 * Create the function to calculate the next block to process.
 *
 * Two dependencies need to be injected for the calculation to be done:
 *
 * `getBlock`: A function that receives a hash and returns a `Promise` resolving
 * to an object containing at least a `hash` and a `previousHash` properties.
 *
 * `compareBlocks`: A function that given two blocks returned by `getBlock`
 * returns a number that sorts blocks in ascending order by difficulty, chain
 * work, etc. The number shall be positive, zero or negative as the compare
 * function expected by `Array.prototype.sort`.
 *
 * @param {Object} options The functions to support the calculation function.
 * @param {Function} options.getBlock The function to get the block.
 * @param {Function} options.compareBlocks The function to compare two blocks.
 * @returns {calculateNextBlock} Function to calcualte the next block.
 */
function createCalculateNextBlock (options) {
  const { getBlock, compareBlocks } = options

  /**
   * Calculate next block to process and action to take.
   *
   * It returns a function that calculates the blocks tree based on the
   * `incomingHash` and `currentHash`, returning a `Promise` that will resolve
   * to the action that shall be taken. The three possible scenarios are:
   *
   * - The block hash `next` has to be processed.
   * - The block hash `undo` has to be removed.
   * - There is nothing to do.
   *
   * In either case, the `best` hash indicates what is the best known block.
   *
   * If the `currentHash` is not specified, the genesis block will be looked up
   * and reported as the next block to process.
   *
   * @param {string} incomingHash The incoming block hash.
   * @param {string} [currentHash] The current block hash.
   * @returns {Promise<{best:string,next?:string,undo?:string}>} The best block
   *          hash and action.
   */
  function calculateNextBlock (incomingHash, currentHash) {
    if (!currentHash) {
      return generateTree(getBlock, null, incomingHash)
        .then(function (tree) {
          const nextList = findPath(tree, incomingHash, true).reverse()
          return { best: incomingHash, next: nextList[0] }
        })
    }

    if (currentHash === incomingHash) {
      return Promise.resolve({ best: currentHash })
    }

    return Promise.all([getBlock(currentHash), getBlock(incomingHash)])
      .then(function ([currentBlock, incomingBlock]) {
        if (incomingBlock.previousHash === currentHash) {
          return Promise.resolve({ best: incomingHash, next: incomingHash })
        }

        if (compareBlocks(incomingBlock, currentBlock) <= 0) {
          return Promise.resolve({ best: currentHash })
        }

        return generateTree(getBlock, currentHash, incomingHash)
          .then(function (tree) {
            const undoList = findPath(tree, currentHash)
            const nextList = findPath(tree, incomingHash).reverse()
            return undoList.length
              ? { best: incomingHash, undo: currentHash }
              : { best: incomingHash, next: nextList[0] }
          })
      })
  }

  return calculateNextBlock
}

module.exports = createCalculateNextBlock
