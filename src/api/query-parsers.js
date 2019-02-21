'use strict'

const { identity } = require('lodash/fp')
const { isArray, mergeWith, negate, overEvery, some } = require('lodash')
const { isAddress, isHexStrict } = require('web3').utils

// check if the list only contains Ethereum addresses
const evaluateAddresses = (prop, list) => ({
  errors: some(list, negate(overEvery([isHexStrict, isAddress])))
    ? [prop]
    : [],
  query: {
    [prop]: list
  }
})

// parse the addresses string and evaluate
const evaluateAddressesList = (prop, str) =>
  str && evaluateAddresses(prop, str.split(',').filter(identity))

// check if the number is an integer equal or greater than 0
const evaluateCardinalNum = (prop, num) => ({
  errors: Number.isSafeInteger(num) && num >= 0
    ? []
    : [prop],
  query: {
    [prop]: num
  }
})

// parse the number string and evauate
const evaluateCardinal = (prop, str) =>
  str && evaluateCardinalNum(prop, Number.parseInt(str, 10))

// create a querystring props parser
const parsePropWith = evalFn => prop => query => evalFn(prop, query[prop])

const parseAddressesList = parsePropWith(evaluateAddressesList)

const parseCardinal = parsePropWith(evaluateCardinal)

const concatArrays = (objValue, srcValue) =>
  isArray(objValue) ? objValue.concat(srcValue) : undefined

const mergeWithArrays = (obj, src) => mergeWith(obj, src, concatArrays)

// parse a querystring with the given parsers list
const parseQuery = (parsers, query = {}) =>
  parsers
    .map(parser => parser(query))
    .reduce(mergeWithArrays, {
      errors: [],
      query: {}
    })

module.exports = { parseAddressesList, parseCardinal, parseQuery }
