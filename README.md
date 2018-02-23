# Ethereum Blockchain Indexer

> 🗂 Simple indexer service for Ethereum blockchains. This service will index an Ethereum blockchain and provide a REST API to query all transactions related to a give address.

## Requirements

- Node.JS v8
- Redis v4

## Configuration

Create an `<environment>.json` or `hostname.json` file in the `config` folder with specific configuration requirements. Follow the [config ](https://github.com/lorenwest/node-config/) module guidelines.

## Start

Install dependencies with `npm install` and then start the server with `npm start`.

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

### `GET /blocks/latest/number`

Will return an object containing the `number` of the last block indexed.

```json
{
  "number": "543210"
}
```
