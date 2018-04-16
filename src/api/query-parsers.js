'use strict'

const { identity } = require('lodash/fp')
const { isArray, mergeWith, negate, overEvery, some } = require('lodash')
const { isAddress, isHexStrict } = require('web3-utils')

const evaluateAddresses = (prop, list) => ({
  errors: some(list, negate(overEvery([isHexStrict, isAddress])))
    ? [prop]
    : [],
  query: {
    [prop]: list
  }
})

const evaluateAddressesList = (prop, str) =>
  str && evaluateAddresses(prop, str.split(',').filter(identity))

const evaluateCardinalNum = (prop, num) => ({
  errors: Number.isSafeInteger(num) && num >= 0
    ? []
    : [prop],
  query: {
    [prop]: num
  }
})

const evaluateCardinal = (prop, str) =>
  str && evaluateCardinalNum(prop, Number.parseInt(str, 10))

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
