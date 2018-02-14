// settimeout promisified
function asyncSetTimeout (timeout) {
  return new Promise(function (resolve) {
    setTimeout(resolve, timeout)
  })
}

module.exports = asyncSetTimeout
