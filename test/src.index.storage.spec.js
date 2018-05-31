'use strict'

const proxyquire = require('proxyquire').noCallThru()

require('chai').should()

const hexToBuffer = hex => Buffer.from(hex.substr(2), 'hex')

const scToBuff = ({ s, m }) => ({ s, m: hexToBuffer(m) })

describe('Parser storage', function () {
  it('should reorg ETH transactions', function () {
    const stored = {
      'blk:3:eth': ['0x30', '0x31'].map(hexToBuffer),
      'blk:4:eth': ['0x31', '0x40'].map(hexToBuffer),
      'eth:0x30': [{ s: 3, m: '0x0330' }].map(scToBuff),
      'eth:0x31': [{ s: 3, m: '0x0331' }, { s: 4, m: '0x0431' }].map(scToBuff),
      'eth:0x40': [{ s: 4, m: '0x0440' }].map(scToBuff)
    }

    const notifications = []

    const pubSubStub = {
      publish (event, data) {
        notifications.push({ event, data })
      }
    }

    const dbStub = {
      del (key) {
        delete stored[key]
        return Promise.resolve()
      },
      pubsub: () => pubSubStub,
      smembers: key => Promise.resolve(stored[key]),
      zrangebyscore: (key, min, max) => Promise.resolve(
        stored[key]
          .filter(({ s }) => s >= min && s <= max)
          .map(({ m }) => m)
      ),
      zrem (key, member) {
        stored[key] = stored[key].filter(({ m }) => m.compare(member))
        return Promise.resolve()
      }
    }

    const storage = proxyquire('../src/indexer/storage', {
      '../db': dbStub
    })

    return storage.removeData({ number: 4 })
      .then(function () {
        stored['blk:3:eth'].should.have.lengthOf(2)
        stored.should.not.have.property('blk:4:eth')
        stored['eth:0x30'].should.have.lengthOf(1)
        stored['eth:0x31'].should.have.lengthOf(1)
        stored['eth:0x31'][0].should.have.property('s', 3)
        stored['eth:0x31'][0].should.have.property('m')
        stored['eth:0x31'][0].m.compare(hexToBuffer('0x0331')).should.equal(0)
        stored['eth:0x40'].should.have.lengthOf(0)

        notifications.should.have.lengthOf(2)
        notifications.should.have.deep.members([
          { event: 'tx:0x31', data: 'eth:0x0431:unconfirmed' },
          { event: 'tx:0x40', data: 'eth:0x0440:unconfirmed' }
        ])
      })
  })
})
