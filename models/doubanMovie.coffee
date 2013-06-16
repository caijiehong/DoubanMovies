settings = require('../settings')
httpHelp = require('../common/httpHelp')
dateHelp = require('../common/dateHelp')
doubanUser = require('./doubanUser')

movieUpdateList = {}
dbPool = require('./dbPool')

exports.check = (doubanId) ->
  return true if movieUpdateList[doubanId]

  movies = dbPool.pop().collection 'movies'
  movies.findOne { id: parseInt doubanId }, (err, item) ->
    movieUpdateList[doubanId] = 1 if !err and !item


exports.checkList = checkList = (ar, user) ->
  return true if !ar || !ar.length

  checkObj = {}
  checkObj[id] = true for id in ar
  dba = dbPool.pop()
  movies = dba.collection 'movies'
  cur = movies.find {id:{$in:ar}}, {_id:0, id:1}
  cur.toArray (err, list)->
    console.error 'doubanMovie', err if err

    console.log 'doubanMovie', "#{user} bring #{ar.length - list.length} movies need to update"
    if list
      delete checkObj[item.id] for item in list

    movieUpdateList[key] = 1 for key of checkObj


exports.updateMovie = updateMovie = (doubanId, onUpdated)->
  url = "http://api.douban.com/v2/movie/subject/#{doubanId}?apikey=#{settings.doubanAPIKey}"
  httpHelp.get url, (data) ->
    try
      movie = JSON.parse data
      if movie.id
        movie.id = parseInt movie.id

        readDoubanPage doubanId, (languages, duration, pubdate)->
          movie.languages = languages
          movie.duration = duration
          movie.pubdate = pubdate

          movies = dbPool.pop().collection 'movies'

          movies.update {id:movie.id}, movie, {safe: true, upsert: true}, onUpdated

          if movie.casts and movie.casts.length
            casts = dbPool.pop().collection 'casts'
            casts.remove {movieId:movie.id}, (err, res) ->
              casts.insert ({movieId:movie.id, id:cast.id, name: cast.name} for cast in movie.casts), true, ((err, res)-> return true)

          if movie.directors and movie.directors.length
            directors = dbPool.pop().collection 'directors'
            directors.remove {movieId:movie.id}, (err, res) ->
              directors.insert ({movieId:movie.id, id:dir.id, name: dir.name} for dir in movie.directors), true, ((err, res)-> return true)
    catch err
      console.log 'doubanMovie', data
      onUpdated()


exports.init = () ->
  console.log('Init', 'doubanMovie');

  readLoopMovie()

  setInterval readLoopMovie, 1000 * 5


exports.readFrontPage = readFrontPage = () ->
  console.log 'doubanMovie', 'read front page'

  httpHelp.get 'http://movie.douban.com', (html)->
    reg = /movie\.douban\.com\/subject\/(\d+)\//g
    r = null
    movieList = (r[1] while r = reg.exec html)

    reg = /movie\.douban\.com\/people\/([\w]+)\//g
    r = null

    doubanUser.update r[1] while r = reg.exec html


readDoubanPage = (doubanId, onPageRead)->
  url = "http://movie.douban.com/subject/#{doubanId}/"
  httpHelp.get url, (html)->
      duration = 0

      languages = []
      pubdate = 0

      try
        html = html.replace(/\n/g, '');

        reg = /<span property="v:runtime" content="(\d+)/g
        r = ''
        duration = parseInt r[1] while r = reg.exec html

        reg = /<span class="pl">语言:<\/span>([^<]+)/g
        r = ''
        (languages = (lang.trim() for lang in r[1].split '/')) while r = reg.exec html

        reg = /<span property="v:initialReleaseDate" content="(\d{4}-\d{2}-\d{2})/g
        r = ''
        pubdate = parseInt(dateHelp.formatDate(new Date(r[1]), 'YYYYMMdd')) while r = reg.exec html
      catch err
        console.error 'doubanMoive', err
      finally
        onPageRead languages, duration, pubdate


readLoopMovie = ()->
  doubanId = key for key, value of movieUpdateList when value == 1

  return true if !doubanId

  console.log "[movie]: #{doubanId} begin"

  try
    updateMovie doubanId, () ->
      console.log "[movie]: #{doubanId} end"
  catch err
    console.error 'doubanMovie', err
  finally
    delete movieUpdateList[doubanId]
