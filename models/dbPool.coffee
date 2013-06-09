Mongoda = require './mongoda'

DbPool = (dbUrl, count) ->
  count = +count || 1;

  dbList = []
  readIndex = 0
  total = 0

  while count--
    da = new Mongoda dbUrl
    da.open (err, db) ->
      if !err
        dbList.push db
        total++
        console.log 'dbPool', total

  @.pop = ()->
    temp = dbList[readIndex]
    readIndex = (++readIndex) % total
    temp

  return @

module.exports = DbPool