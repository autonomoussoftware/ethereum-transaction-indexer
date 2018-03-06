const debug = require('debug')('time-bomb')

let seq = 0

function create (timeout) {
  const bombId = seq++

  debug('(%d) Created', bombId)

  let ticker = null
  let boomHandler

  function deactivate () {
    if (!ticker) {
      return
    }

    debug('(%d) Timer stopped', bombId)

    clearTimeout(ticker)

    ticker = null
  }

  function reset (ms = 0) {
    deactivate()

    ticker = setTimeout(function () {
      debug('(%d) Boom!', bombId)

      if (boomHandler) {
        boomHandler()
      } else {
        throw new Error('Time bomb exploded!')
      }
    }, ms)

    debug('(%d) Timer set to %dms', bombId, ms)

    return ticker
  }

  function onBoom (handler) {
    boomHandler = handler
  }

  ticker = reset(timeout)

  return {
    reset,
    onBoom,
    deactivate
  }
}

module.exports = { create }
