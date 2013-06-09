MongoClient = (require 'mongodb').MongoClient
settings = require '../settings'

Mongoda = (dbUrl) ->
  _t = @
  _db = null
  _dbUrl = dbUrl

  @.open = (onOpen) ->
    MongoClient.connect _dbUrl, (err, db) ->
      console.error 'DBError', err if err
      _db = db
      onOpen err, _t if onOpen
      return _t

    return @

  @.close = () ->
    _db.close if _db
    @

  @.collection = (collectionName, onData) ->
    if onData
      _db.collection collectionName, ((err, col) -> onData col)
    else
      return _db.collection collectionName

  return @

module.exports = Mongoda