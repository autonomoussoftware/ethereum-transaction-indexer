'use strict'

const { identity } = require('lodash/fp')
const { isArray, mergeWith, negate, some } = require('lodash')

const isEthAddress = require('../../lib/is-eth-address')
const isSafeCardinal = require('../../lib/is-safe-cardinal')

const evaluateAddresses = (prop, list) => ({
  errors: some(list, negate(isEthAddress))
    ? [prop]
    : [],
  query: {
    [prop]: list
  }
})

const evaluateAddressesList = (prop, str) =>
  str && evaluateAddresses(prop, str.split(',').filter(identity))

const evaluateCardinal = (prop, str) => str && {
  errors: isSafeCardinal(str)
    ? []
    : [prop],
  query: {
    [prop]: Number.parseInt(str, 10)
  }
}

const parsePropWith = evalFn => prop => query => evalFn(prop, query[prop])

const parseAddressesList = parsePropWith(evaluateAddressesList)

const parseCardinal = parsePropWith(evaluateCardinal)

const concatArrays = (objValue, srcValue) =>
  isArray(objValue) ? objValue.concat(srcValue) : undefined

const mergeWithArrays = (obj, src) => mergeWith(obj, src, concatArrays)

const parseQuery = (parsers, query = {}) =>
  parsers
    .map(parser => parser(query))
    .reduce(mergeWithArrays, {
      errors: [],
      query: {}
    })

module.exports = { parseAddressesList, parseCardinal, parseQuery }
