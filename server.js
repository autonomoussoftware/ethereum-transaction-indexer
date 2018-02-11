const indexer = require('./src/indexer')
const api = require('./src/api')

// initiate the API server
api.start()

// kick start indexing of blocks and capture errors
indexer.start()
