const indexer = require('./src/indexer')
const api = require('./src/api')

api.start()
indexer.start()
