'use strict'

require('chai').should()

const getPubSub = require('../src/pubsub')

describe('PubSub', function () {
  it('should subscribe, publish and receive a tx message', function (done) {
    const pubsub = getPubSub()

    const address = '0x30'
    const txid = '0x0330'

    pubsub.on('pmessage', function (pattern, channel, message) {
      pattern.should.equal('tx:*')
      channel.should.equal(`tx:${address}`)
      message.should.equal(`${txid}:confirmed`)
      done()
    })
    pubsub.psubscribe('tx:*')
    pubsub.publish(`tx:${address}`, `${txid}:confirmed`)
  })
})
