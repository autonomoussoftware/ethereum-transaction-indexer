[![Build Status](https://travis-ci.com/autonomoussoftware/ethereum-blockchain-indexer.svg?branch=develop)](https://travis-ci.com/autonomoussoftware/ethereum-blockchain-indexer)
[![Code Style](https://img.shields.io/badge/code%20style-bloq-0063a6.svg)](https://github.com/bloq/eslint-config-bloq)
[![Known Vulnerabilities](https://snyk.io/test/github/autonomoussoftware/ethereum-blockchain-indexer/badge.svg?targetFile=package.json)](https://snyk.io/test/github/autonomoussoftware/ethereum-blockchain-indexer)

# Ethereum Blockchain Indexer

Simple indexer service for Ethereum blockchains. This service will index an Ethereum blockchain and provide a REST API to query all transactions related to a given address and a [Socket.IO](https://socket.io/) subscription mechanism to be notified when those are indexed.

## Requirements

- Node.JS v8
- Redis v4
- Ethereum node (i.e. Geth or Parity)

## Configuration

Set proper environment variables or create an `<environment>.json` or `hostname.json` file in the `config` folder with specific configuration. Follow the [config ](https://github.com/lorenwest/node-config/) module guidelines.

## Start

Install dependencies with `npm install` and then start the indexer or the API with `npm run indexer` or `npm run api`.

Optionally, for test and development purposes, start both components with `npm start`.

## REST API

### `GET /addresses/:address/transactions[?from=<number>&to=<number>]`

Will return a JSON array having all Ethereum transaction IDs related to the given address. Optionally specify `from` and `to` to limit the query to only that block range.

```json
[
  "0x423d66ebf5fa6c16bbf59b4bcbd22eebb25c4c1a3ad4f54eb1bf059e1dd512ec",
  "0x80f188d6e9b4586cc71c99af40f871860c9c7f0965784d9010b7869ea79497dc",
  "0x3611fc43d861e287c66bcb350c34d4ed6f96328ed9c37650e0c15ef1b4d23511",
  "0x2ca2f50183e57663bca09e49f01acd33c2cd25478d060c439a646a427a34fef6"
]
```

### `GET /addresses/:address/tokentransactions[?tokens=<contracts>from=<number>&to=<number>]`

Will return a JSON object containing all tokens related to the address, each one with an array having all transaction IDs related to the given address and token. Optionally specify `from` and `to` to limit the query to only that block range and `tokens` as a comma separated list of token contract addresses.

```json
{
  "0x6d1fb6b9e3bbdedbab33f0f66f7c6615bacbfb2d": [
    "0xb756bfc1ceac6f7fda291cb360bfcaa73bd6c84b829de553406bc928441381b7"
  ],
  "0x02d0f0275244938bac719caa2621da17c503e347": [
    "0xa2820760d045ffb504c9642dce3aae6090b1969b9b0f1798ddc1e86242e2fd4f",
    "0x1a044b332dae6517b0c8405d08d85876b26659464c942e25d938d991a75eee4a",
    "0x1fe940d80c47b06e297cf67e6830b045dfd68fe7f7c31a1f017df083b2135bad"
  ]
}
```

### `GET /blocks/best`

Will return an object containing information on the best indexed block.

```json
{
  "number": 768009,
  "hash": "0x477510530312753b1fca21c337e53e7405be439f37386d319c3431b3ac96875c",
  "totalDifficulty": "813977306712"
}
```

## Events interface

The Socket.IO events interface is available at the following route: `/v1`.

### `subscribe`

Will allow the subscriber to start receiving notifications of new transactions indexed related to the given addresses.

Subscription message:

```json
{
  "event": "subscribe",
  "data": ["0x7ba5156795322902643972684192c9a7a5c01721"]
}
```

Subscription responses:

```json
{
  "event": "tx",
  "data": {
    "type": "eth",
    "txid": "",
    "status": "confirmed"
  }
}
```

The data object has the following properties:

- `type` can be `eth` for ETH transactions or `tok` for ERC20 token transactions.
- `txid` is the indexed transaction id.
- `status` can be `confirmed` or, in the case of a blockchain reorg, it could be `removed`.
- `meta` is any other information i.e. for ERC20 tokens, it will contain the address of the token contract.

## License

MIT
