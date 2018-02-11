# Simple indexer service for Ethereum blockchains

This service will index an Ethereum blockchain and provide a REST API to query all transactions related to a give address.

## Requirements

- Node.JS v8
- Redis v4

## Configuration

Create an `<environment>.json` or `hostname.json` file in the `config` folder with specific configuration requirements. Follow the [config ](https://github.com/lorenwest/node-config/) module guidelines.

## Start

Install dependencies with `npm install` and then start the server with `npm start`.

## REST API

### `GET /addresses/:address/transactions[?from=<min>&to=<max>]`

Will return a JSON array having all transaction IDs related to the given address. Optionally specify `min` and `max` to limit the query to only that block range.

### `GET /blocks/latest/number`

Will return an object containing the `number` of the last block indexed.
