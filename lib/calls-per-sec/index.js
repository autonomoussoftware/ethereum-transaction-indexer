'use strict'

const ONE_SEC = 1000

// wraps a function and fires an event every second with the # of calls to it
function callsPerSec (fn, perSec) {
  let calls = 0

  const interval = setInterval(function () {
    perSec(calls)
    calls = 0
  }, ONE_SEC)

  const wrapped = function (...args) {
    calls += 1
    return fn(...args)
  }

  wrapped.stop = function () {
    clearInterval(interval)
  }

  return wrapped
}

module.exports = callsPerSec
