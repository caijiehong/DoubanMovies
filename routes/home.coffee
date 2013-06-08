_import = require '../import/import'
Mongoda = require '../models/mongoda'
settings = require '../settings'
doubanUser = require('../models/doubanUser')

exports.index =
  get: (req, res)->
    res.render 'index'

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
    res.render 'index',
      {
        doubanKey: settings.doubanAPIKey,
        domain: settings.domain,
        douban_user_id: douban_user_id,
        douban_user_name:douban_user_id
      }
  post: (req, res, douban_user_id)->
    doubanUser.data douban_user_id, (userData)-> res.send userData

exports.update =
  post: (req, res, douban_user_id) ->
    status = doubanUser.update douban_user_id
    res.send(status)