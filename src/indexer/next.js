'use strict'

const web3 = require('./web3')

// recursively populate the tree of blocks with the given block
const populateBlocksTree = (tree, hash) =>
  web3.eth.getBlock(hash)
    .then(function (block) {
      if (!block) {
        return true
      }

      if (tree.completed) {
        return true
      }

      const { parentHash } = block
      tree[hash] = { parentHash }

      if (tree[parentHash]) {
        tree[parentHash].root = true
        tree.completed = true
        return true
      }

      return populateBlocksTree(tree, parentHash)
    })

// create a tree of blocks from blocks A and B to their common parent block
function generateBlocksTree (blockA, blockB) {
  const tree = {}
  return Promise.all([
    populateBlocksTree(tree, blockA.hash),
    populateBlocksTree(tree, blockB.hash)
  ])
    .then(() => tree)
}

// given a tree of blocks, find how to reach from the hash to the root
function findPathToRoot (tree, hash) {
  const list = [ hash ]
  let current = hash
  while (!tree[current].root) {
    const parentHash = tree[current].parentHash
    list.push(parentHash)
    current = parentHash
  }
  list.pop()
  return list
}

// calculate next block to reach `to` starting at `from`
function calculateNextBlock (from, to) {
  if (to.parentHash === from.hash) {
    return Promise.resolve(to)
  }

  return generateBlocksTree(from, to)
    .then(tree => findPathToRoot(tree, to.hash).pop())
    .then(web3.eth.getBlock)
}

module.exports = calculateNextBlock
