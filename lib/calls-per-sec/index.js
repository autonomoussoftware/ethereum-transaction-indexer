'use strict'

const ONE_SEC = 1000

// wraps a function and fires an event every second with the # of calls to it
function callsPerSec (fn, perSec) {
  let calls = 0
  let lastArgs = []

  const interval = setInterval(function () {
    perSec(calls, lastArgs)
    calls = 0
  }, ONE_SEC)

  const wrapped = function (...args) {
    calls += 1
    lastArgs = args
    return fn(...args)
  }

  wrapped.stop = function () {
    clearInterval(interval)
  }

  return wrapped
}

module.exports = callsPerSec
