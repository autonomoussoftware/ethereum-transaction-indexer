'use strict'

const ONE_SEC = 1000

// Wraps a function and fires an event periodically with the # of calls in that
// period.
function callsPerSec (fn, handler, period = ONE_SEC) {
  let calls = 0
  let lastArgs = []

  const interval = setInterval(function () {
    handler(calls, lastArgs)
    calls = 0
  }, period)

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
