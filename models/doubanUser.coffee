httpHelp = require('../common/httpHelp')
doubanMovies = require('./doubanMovie.js')
events = require('events')
settings = require('../settings')

userUpdateList = {}
dbPool = require('./dbPool')

exports.userStatus = userStatus = {
status_NotFound: 0,
status_InQueue: 1,
status_Reading: 2,
status_Done: 3
}

exports.data = (user, onDataLoad) ->
  db = dbPool.pop()

  movies = db.collection 'movies'
  douUsers = db.collection 'douUsers'
  casts = db.collection 'casts'
  directors = db.collection 'directors'

  _t =
    totalDuration: 0
    totalWatch: 0
    averageRate: 0
    rateCount: 0
    userName: user
    rate: [['5星',0], ['4星',0], ['3星',0], ['2星',0], ['1星',0]]
    watchTime: []

  douUsers.findOne { userId: user }, (err, userItem) ->

    _t.totalWatch = userItem.totalWatch
    _t.userName = userItem.userName || userItem.userId

    movieList = userItem.movies.sort (a, b) -> b.date - a.date

    lastMonth = 0
    lastCount = 0

    for item in movieList
      month = parseInt item.date / 100
      if lastMonth and lastMonth != month
        _t.watchTime.push [lastMonth, lastCount]
        lastCount = 0

      lastMonth = month
      lastCount++

      if item.rate > 0 and item.rate < 6
        _t.rateCount++
        _t.averageRate += item.rate
        rate = 5 - item.rate
        _t.rate[rate][1] = _t.rate[rate][1] + 1

    _t.averageRate = _t.averageRate / _t.totalWatch

    watchList = (parseInt item.id for item in userItem.movies)

    casts.group ['name']
    , {movieId: {$in:watchList}}
    , {count:0}
    , ((obj, prev)-> prev.count++)
    , true
    , (err, result) ->
      if result
        _t.casts = ([item.name, item.count] for item in (result.sort (a,b)-> b.count - a.count)[...20])
      sync()

    directors.group ['name']
    , {movieId: {$in:watchList}}
    , {count:0}
    , ((obj, prev)-> prev.count++)
    , true
    , (err, result) ->
      if result
        _t.directors = ([item.name, item.count] for item in (result.sort (a,b)-> b.count - a.count)[...20])
      sync()

    cur = movies.find {id:{$in:watchList}}, {_id:0, countries:1, genres:1, year:1, duration:1}
    cur.toArray (err, list)->
      console.error 'doubanUser', err if err

      countries = {}
      genres = {}
      years = {}
      for movie in list
        _t.totalDuration += movie.duration if movie.duration > 0

        if movie.countries
          for cou in movie.countries
            countries[cou] = (countries[cou]||0) + 1

        if movie.genres
          for key in movie.genres
            genres[key] = (genres[key]||0) + 1

        if movie.year and year = parseInt movie.year
          year = if year >= 2000 then year.toString()
          else if year >= 1995 then '95\'s'
          else if year >= 1990 then '90\'s'
          else if year >= 1980 then '80\'s'
          else '其他'
          years[year] = (years[year]||0) + 1

      _t.countries = (([cou, count] for cou, count of countries when count > 1).sort (a,b) -> b[1] - a[1])[...8]

      _t.genres = (([key, count] for key, count of genres when count > 1).sort (a,b) -> b[1] - a[1])[...10]

      _t.years = ([key, count] for key, count of years).sort ((a,b) -> parseInt b[0] - parseInt a[0])

      sync()

  syncFlag = 3
  sync = () ->
    onDataLoad(_t) if --syncFlag <= 0

exports.update = (douban_user_id) ->
  return userUpdateList[douban_user_id].status if userUpdateList[douban_user_id]

  userUpdateList[douban_user_id] = { user: douban_user_id, status: userStatus.status_InQueue}

  return userStatus.status_NotFound

exports.init = () ->
  console.log 'Init', 'doubanUser'
  readLoopUser()

exports.top = (topN, onDataLoad) ->
  douUsers = dbPool.pop().collection 'douUsers'
  cur = douUsers.find({}, {userId: 1, userName: 1, totalWatch: 1, _id: 0}, {limit: topN, sort: {'totalWatch': -1}})
  cur.toArray (err, results)->
    onDataLoad(results)

readLoopUser = ()->
  douban_user_id = key for key of userUpdateList

  if douban_user_id
    console.log(douban_user_id + ' update begin!')
    new DoubanUser(douban_user_id).on 'update', ()->
      console.log(douban_user_id + ' update success!')
      delete userUpdateList[douban_user_id]
      setTimeout readLoopUser, 100
  else
    setTimeout readLoopUser, 500

DoubanUser = (userId)->
  _t = @
  startIndex = 0
  eve = new events.EventEmitter()

  @.on = (event, listener) ->
    eve.on(event, listener)
    return @

  watchList = []
  watched = {}
  readUser = userId
  doubanName = userId

  douUsers = dbPool.pop().collection 'douUsers'
  douUsers.findOne { userId: readUser }, (err, item) ->
    if item and item.movies and item.movies.length
      watchList = item.movies || []
      for item in watchList
        watched[item.id] = true

    readList()

  updateDB = ()->
    try
      toCheckList = (parseInt item.id for item in watchList)
      doubanMovies.checkList(toCheckList, readUser) if toCheckList and toCheckList.length

      douUsers.update {userId: userId}
      , {userId: userId, userName: doubanName, movies: watchList, totalWatch: watchList.length}
      , {safe: true, upsert: true}
      , () -> return true

    catch err
      console.error 'doubanUser', err
    finally
      eve.emit 'update'


  readList = () ->
    try
      pageUrl = "http://movie.douban.com/people/#{userId}/collect?start=#{startIndex}&mode=list"

      httpHelp.get pageUrl, (data)->
        stop = false
        reg = /([^<>]+)看过的电影/g
        r = null
        doubanName = r[1].trim() while r = reg.exec(data)

        ar = []
        reg = /movie\.douban\.com\/subject\/(\d+)\//g
        r = null
        while r = reg.exec(data)
          id = r[1];
          if watched[id]
            stop = true;
          else
            movie = {id: id}
            ar.push(movie)
            watchList.push(movie)

        reg = /span class="rating(\d)-t"><\/span>[^\/]*(\d{4}-\d{2}-\d{2})/g
        r = null
        i = 0
        while r = reg.exec(data)
          rate = 0
          date = ''
          rate = parseInt(r[1]) if r[1]
          date = parseInt(r[2].replace(/-/g, '')) if r[2]
          break if !ar[i]

          ar[i].rate = rate
          ar[i].date = date
          i++

        if i == 0 || stop
          return updateDB()
        else
          startIndex += 30
          setTimeout readList, (500 * 1)
    catch err
      eve.emit('update')

  return @


