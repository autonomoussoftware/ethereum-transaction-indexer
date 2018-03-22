// settimeout promisified

'use strict'

const asyncSetTimeout = timeout =>
  new Promise(function (resolve) {
    setTimeout(resolve, timeout)
  })

module.exports = asyncSetTimeout
