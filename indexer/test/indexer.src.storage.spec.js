'use strict'

require('chai').should()

describe('Parser storage', function () {
  it('should reorg ETH transactions', function () {
    const stored = {
      'blocks': {
        3: ['0x30', '0x31'],
        4: ['0x31', '0x40']
      },
      '0x30': [{ n: 3, t: '0x0330' }],
      '0x31': [{ n: 3, t: '0x0331' }, { n: 4, t: '0x0431' }],
      '0x40': [{ n: 4, t: '0x0440' }]
    }

    const notifications = []

    const dbnum = '0'

    const pubSubStub = {
      dbnum,
      publish (event, data) {
        notifications.push({ event, data })
      }
    }

    const dbStub = {
      deleteAddressTransaction ({ addr, txid }) {
        stored[addr] = stored[addr].filter(({ t }) => t !== txid)
        return Promise.resolve()
      },
      deleteBlockAddresses ({ number }) {
        delete stored.blocks[number]
        return Promise.resolve()
      },
      getAddressTransactions: ({ addr, min, max }) =>
        Promise.resolve(
          stored[addr].filter(({ n }) => n >= min && n <= max).map(({ t }) => t)
        ),
      getBlockAddresses: ({ number }) =>
        Promise.resolve(stored.blocks[number])
    }

    const storage = require('../src/storage')

    const api = storage.init(dbStub, pubSubStub)

    return api.removeData({ number: 4 })
      .then(function () {
        stored.should.deep.equal({
          'blocks': {
            3: ['0x30', '0x31']
          },
          '0x30': [{ n: 3, t: '0x0330' }],
          '0x31': [{ n: 3, t: '0x0331' }],
          '0x40': []
        })

        notifications.should.have.lengthOf(2)
        notifications.should.have.deep.members([
          { event: `${dbnum}:tx:0x31`, data: '0x0431:unconfirmed' },
          { event: `${dbnum}:tx:0x40`, data: '0x0440:unconfirmed' }
        ])
      })
  })
})
