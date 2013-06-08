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
      onOpen err, db
      @

  @.close = () ->
    _db.close if _db
    @

  @.collection = (collectionName) -> _db.collection(collectionName) if _db

  return @

module.exports = Mongoda