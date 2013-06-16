Mongoda = require './mongoda'


dbList = []
readIndex = 0
_dbUrl = ''


exports.init = (dbUrl, count) ->
  _dbUrl = dbUrl
  count = +count || 1;
  conCount = 0
  for i in [0...count]
    da = new Mongoda _dbUrl
    da.open (err, db)->
      dbList.push db

      if ++conCount == count
        console.log 'dbPool', "init #{count} connection"

exports.pop = () ->
  da = dbList[readIndex]
  readIndex = (readIndex + 1) % dbList.length
  return da

