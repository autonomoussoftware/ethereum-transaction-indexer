'use strict'

const BN = require('bn.js')

// execute an op between two BN objects
const inBN = (op, a, b) => new BN(a)[op](new BN(b))

module.exports = inBN
