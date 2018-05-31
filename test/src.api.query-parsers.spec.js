'use strict'

require('chai').should()

const {
  parseAddressesList,
  parseCardinal,
  parseQuery
} = require('../src/api/query-parsers')

const addr1 = '0x1234567890123456789012345678901234567890'
const addr2 = '0x123456789abcdef0123456789abcdef012345678'

describe('Query parsers', function () {
  describe('parseCardinal', function () {
    it('should parse no query', function () {
      parseQuery([parseCardinal('n')])
        .should.deep.equal({ errors: [], query: {} })
    })

    it('should parse empty query', function () {
      parseQuery([parseCardinal('n')], {})
        .should.deep.equal({ errors: [], query: {} })
    })

    it('should parse a cardinal', function () {
      parseQuery([parseCardinal('n')], { n: '1' })
        .should.deep.equal({ errors: [], query: { n: 1 } })
    })

    it('should not parse a negative', function () {
      parseQuery([parseCardinal('n')], { n: '-1' })
        .should.have.property('errors')
        .deep.equal(['n'])
    })

    it('should not parse a string', function () {
      parseQuery([parseCardinal('n')], { n: 'a' })
        .should.have.property('errors')
        .deep.equal(['n'])
    })
  })

  describe('parseAddressesList', function () {
    it('should parse empty query', function () {
      parseQuery([parseAddressesList('a')], {})
        .should.deep.equal({ errors: [], query: {} })
    })

    it('should parse a single address', function () {
      parseQuery([parseAddressesList('a')], { a: addr1 })
        .should.deep.equal({ errors: [], query: { a: [addr1] } })
    })

    it('should parse two addresses', function () {
      parseQuery([parseAddressesList('a')], { a: `${addr1},${addr2}` })
        .should.deep.equal({ errors: [], query: { a: [addr1, addr2] } })
    })

    it('should not parse a ill-formatted address', function () {
      parseQuery([parseAddressesList('a')], { a: 'bad' })
        .should.have.property('errors')
        .deep.equal(['a'])
    })

    it('should not parse a ill-formatted address within a list', function () {
      parseQuery([parseAddressesList('a')], { a: `${addr1},bad` })
        .should.have.property('errors')
        .deep.equal(['a'])
    })
  })

  describe('Multiple parsers', function () {
    it('should parse empty query', function () {
      parseQuery([parseCardinal('n'), parseCardinal('m')], {})
        .should.deep.equal({ errors: [], query: {} })
    })

    it('should parse two cardinals', function () {
      parseQuery([parseCardinal('n'), parseCardinal('m')], { n: '1', m: '2' })
        .should.deep.equal({ errors: [], query: { n: 1, m: 2 } })
    })

    it('should fail if first fails', function () {
      parseQuery([parseCardinal('n'), parseCardinal('m')], { n: 'a', m: '1' })
        .should.have.property('errors')
        .deep.equal(['n'])
    })

    it('should fail if second fails', function () {
      parseQuery([parseCardinal('n'), parseCardinal('m')], { n: '1', m: 'a' })
        .should.have.property('errors')
        .deep.equal(['m'])
    })
  })

  describe('Indexer queries', function () {
    it('should properly parse a full query', function () {
      const query = {
        from: '0',
        to: '50000',
        tokens: `${addr1},${addr2}`
      }
      parseQuery([
        parseCardinal('from'),
        parseCardinal('to'),
        parseAddressesList('tokens')
      ], query)
        .should.deep.equal({
          errors: [],
          query: {
            from: 0,
            to: 50000,
            tokens: [addr1, addr2]
          }
        })
    })
  })
})
