'use strict'

const ethAddressRegex = /^0x[0-9a-fA-F]{40}$/

const isEthAddress = str => ethAddressRegex.test(str)

module.exports = isEthAddress
