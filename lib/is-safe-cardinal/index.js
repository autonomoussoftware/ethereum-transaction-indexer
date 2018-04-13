'use strict'

const cardinalRegex = /^[0-9]+$/

const isSafeCardinal = str =>
  cardinalRegex.test(str) &&
  str <= Number.MAX_SAFE_INTEGER

module.exports = isSafeCardinal
