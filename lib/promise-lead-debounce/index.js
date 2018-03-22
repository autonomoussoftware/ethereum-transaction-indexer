'use strict'

require('promise-prototype-finally')

// allow only a single promise to be executed at once
function debounce (fn) {
  let promise = null
  return function (...args) {
    if (!promise) {
      promise = Promise.resolve(fn(...args))
        .finally(function () {
          promise = null
        })
    }
    return promise
  }
}

module.exports = debounce
