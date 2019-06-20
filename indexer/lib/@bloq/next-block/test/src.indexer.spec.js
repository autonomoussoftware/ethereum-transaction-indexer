'use strict'

require('chai').should()

const createCalculateNextBlock = require('../src')

/**
 * The blocks tree has the following shape:
 *
 * 5 6
 * | |
 * 3 4
 * |/
 * 2
 * |
 * 1
 * |
 * 0
 *
 * The difficulty/chainwork of blocks is proportional to its number.
 */
const blocks = {
  0: { hash: '0', previousHash: null, difficulty: 0 },
  1: { hash: '1', previousHash: '0', difficulty: 10 },
  2: { hash: '2', previousHash: '1', difficulty: 20 },
  3: { hash: '3', previousHash: '2', difficulty: 30 },
  4: { hash: '4', previousHash: '2', difficulty: 40 },
  5: { hash: '5', previousHash: '3', difficulty: 50 },
  6: { hash: '6', previousHash: '4', difficulty: 60 }
}

const calculateNextBlock = createCalculateNextBlock({
  getBlock: hash => Promise.resolve(blocks[hash]),
  compareBlocks: (a, b) => a.difficulty - b.difficulty
})

describe('Next block calculator', function () {
  it('should do nothing if hashes are equal', function () {
    return calculateNextBlock('1', '1')
      .then(function (result) {
        result.should.deep.equal({ best: '1' })
      })
  })

  it('should advance to the incoming block', function () {
    return calculateNextBlock('2', '1')
      .then(function (result) {
        result.should.deep.equal({ best: '2', next: '2' })
      })
  })

  it('should advance only one block if incoming higher than next', function () {
    return calculateNextBlock('3', '1')
      .then(function (result) {
        result.should.deep.equal({ best: '3', next: '2' })
      })
  })

  it('should rewind on reorg', function () {
    return calculateNextBlock('4', '3')
      .then(function (result) {
        result.should.deep.equal({ best: '4', undo: '3' })
      })
  })

  it('should do nothing if incoming is lower than current', function () {
    return calculateNextBlock('4', '5')
      .then(function (result) {
        result.should.deep.equal({ best: '5' })
      })
  })

  it('should rewind on deep reorg', function () {
    return calculateNextBlock('6', '5')
      .then(function (result) {
        result.should.deep.equal({ best: '6', undo: '5' })
      })
  })

  it('should advance if starting from scratch', function () {
    return calculateNextBlock('2')
      .then(function (result) {
        result.should.deep.equal({ best: '2', next: '0' })
      })
  })
})
