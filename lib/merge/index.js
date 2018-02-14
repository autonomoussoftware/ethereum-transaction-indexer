const flatten = array => array.reduce((merged, obj) => Object.assign(merged, obj), {})

module.exports = flatten
