_import = require '../import/import'
Mongoda = require '../models/mongoda'
settings = require '../settings'
doubanUser = require('../models/doubanUser')
doubanMovie = require '../models/doubanMovie'

exports.index =
  get: (req, res)->
    doubanUser.top 25, (results) ->
      res.render 'index',
        {
        doubanKey: settings.doubanAPIKey,
        topList: results
        }

exports.upload =
  post: (req, res)->
    col = req.body['col']
    data = req.body['data']
    data = JSON.parse(data)

    _import.insertData col, data
    res.send('1')


exports.findone =
  get: (req, res)->
    (new Mongoda(settings.dbUrl)).open (err, db)->
      col = db.collection req.param 'col'
      col.findOne {}, (err, item)->
        res.send item

exports.user =
  get: (req, res, douban_user_id)->
    doubanUser.top 25, (results) ->
      res.render 'index',
        {
        doubanKey: settings.doubanAPIKey,
        domain: settings.domain,
        douban_user_id: douban_user_id,
        douban_user_name: douban_user_id,
        topList: results
        }

  post: (req, res, douban_user_id)->
    start = new Date
    doubanUser.data douban_user_id, (userData)->
      end = new Date
      console.log 'request ' + douban_user_id + ' cost: ', end - start
      res.send userData

exports.update =
  post: (req, res, douban_user_id) ->
    status = doubanUser.update douban_user_id
    res.send('success')

exports.loadusers =
  get: (req, res)->
    da = new Mongoda settings.dbUrl

    da.open (err, db) ->
      users = da.collection 'users'

      douUsers = {}
      cur = users.find()
      cur.toArray (err, list) ->

        for item in list
          movie = {rate:item.rate, date:item.date, id: item.id}
          if douUsers[item.user]
            douUsers[item.user].movies.push movie
          else
            douUsers[item.user] = {userId:item.user, userName:item.user, movies:[movie]}


        value.totalWatch = value.movies.length for key, value of douUsers

        userArray = (value for key, value of douUsers)

        collection = db.collection 'douUsers'
        collection.insert userArray, (err, res) ->
          db.close()
          console.error err if err

    res.send('success')

exports.removemovie =
  get: (req, res)->
    da = new Mongoda settings.dbUrl

    da.open (err, db) ->
      movies = db.collection 'movies'

      movies.group ['id']
      , {}
      , {count:0}
      , ((obj, prev) => prev.count++)
      , false
      , (err1, result1)->
        db.close();
        if err1
          console.error err1
          return

        array = (item.id for item in result1 when item.count > 1)

        movies.remove {id:{$in:array}}, (err, result) -> console.log result

    res.send('success');

exports.frontpage =
  get: (req, res) ->
    doubanMovie.readFrontPage()
    res.send('success');

