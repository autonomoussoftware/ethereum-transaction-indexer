[![Build Status](https://travis-ci.com/autonomoussoftware/ethereum-blockchain-indexer.svg?branch=develop)](https://travis-ci.com/autonomoussoftware/ethereum-blockchain-indexer)
[![Code Style](https://img.shields.io/badge/code%20style-bloq-0063a6.svg)](https://github.com/bloq/eslint-config-bloq)
[![Known Vulnerabilities](https://snyk.io/test/github/autonomoussoftware/ethereum-blockchain-indexer/badge.svg?targetFile=package.json)](https://snyk.io/test/github/autonomoussoftware/ethereum-blockchain-indexer)

# Transaction Indexer

Simple transaction indexing service for Ethereum blockchains.
This service will index transactions, provide a REST API to query all transactions related to a given address and a [Socket.IO](https://socket.io/) subscription mechanism to be notified when new transactions are indexed.

## Requirements

- [Node.JS v8](https://nodejs.org/)
- [Redis v4](https://redis.io/)
- Ethereum node (i.e. [Geth](https://geth.ethereum.org/) or [Parity](https://www.parity.io/))

## Configuration

Set proper environment variables or create an `<environment>.json` or `hostname.json` file in the `config` folder with specific configuration.
Follow the [config](https://github.com/lorenwest/node-config/) module guidelines.

## Start

Install dependencies with `npm install` and then start the indexer or the API with `npm run indexer` or `npm run api`.

Optionally, for test and development purposes, start both components with `npm start`.

## REST API

### `GET /v1/addresses/:address/transactions[?from=<number>&to=<number>]`

Will return a JSON array having all Ethereum transaction IDs related to the given address.
Optionally specify `from` and `to` to limit the query to only that block range.

```json
[
  "0xed3a75ab0677e1a4b24874c5f9ac1a6c38a1b419ff7616fb3ed764713095bf10",
  "0xbfbff2e8bbddbb0575120366be9d2b7dd7f231f8375c43cbb5629ae01ed0003f",
  "0x735df07d3d73a3f95355e0d6bd6c0a8ce1b5922834b7db372b18888ff2660b55",
  "0xc54fb504aa7cfedadd0a25623dc568a7ed8bdf92920520639df785729f580868"
]
```

Transactions are returned in reverse-chronological order.

### `GET /v1/blocks/best`

Will return an object containing information on the best indexed block.

```json
{
  "number": 1828,
  "hash": "0xe04c1cded9a4724d8b22a8f7d6558f778392253ae61a2672a2242c60fe8992df",
  "totalDifficulty": "342830896"
}
```

## Events interface

The Socket.IO events interface is available at the following route: `/v2`.

### `subscribe`

Will allow the subscriber to start receiving notifications of new transactions indexed related to the given addresses.

Subscription message:

```json
{
  "event": "subscribe",
  "data": ["0xb1d4c88a30a392aee6859e6f62738230db0c2d93"]
}
```

Subscription responses:

```json
{
  "event": "tx",
  "data": {
    "txid": "0x64473dec378049472234c854d53f2ce92cd7a94468b62f785b683a9cacdb7f86",
    "status": "confirmed"
  }
}
```

The data object has the following properties:

- `txid` is the indexed transaction id.
- `status` can be `confirmed` or, in the case of a blockchain reorg, it could be `removed`.

## License

MIT
