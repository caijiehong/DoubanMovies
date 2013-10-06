var mysql = require('../common/mysql.js')
    , settings = require('../settings')
    , Q = require('../lib/q.js')
    , httpHelp = require('../common/httpHelp')
    , baiduBucket = require('../common/baiduBucket.js')
    , dateHelp = require('../common/dateHelp.js')
    , util = require('util');

var movies = (function () {
    var that = {}, updateList = {}, toUpdate = 0;

    var updateLoop = function () {
            var id;
            for (var key in updateList) {
                id = +key;
                if (id > 0) {
                    delete updateList[id];
                    console.log('movie', id + ' begin');
                    Q([Q.delay(5000), updateMovie(id)]).spread(function () {
                        if (--toUpdate > 0) {
                            updateLoop();
                        }
                    });

                    return;
                }
            }
        },
        updateMovie = function (id) {
            var def = Q.defer();

            var urlApi = "http://api.douban.com/v2/movie/subject/" + id + "?apikey=" + settings.doubanAPIKey
                , urlPage = 'http://movie.douban.com/subject/' + id + '/';

            Q([httpHelp.get(urlApi), httpHelp.get(urlPage)]).spread(function (dataApi, html) {

                try {
                    var movie = JSON.parse(dataApi);
                } catch (err) {
                    return def.reject(err);
                }

                movie.id = +movie.id;
                if (!movie.id) return def.reject();

                var duration = 0, languages = '', pubdate = 0, imdb, reg, r;
                html = html.replace(/\n/g, '');

                reg = /<span property="v:runtime" content="(\d+)/g;
                r = '';
                while (r = reg.exec(html)) {
                    duration = parseInt(r[1]);
                }

                reg = /<span class="pl">语言:<\/span>([^<]+)/g;
                r = '';
                while (r = reg.exec(html)) {
                    languages = r[1].trim();
                }

                reg = /<span property="v:initialReleaseDate" content="(\d{4}-\d{2}-\d{2})/g;
                r = '';
                while (r = reg.exec(html)) {
                    pubdate = parseInt(dateHelp.formatDate(new Date(r[1]), 'YYYYMMdd'))
                }

                reg = /www\.imdb\.com\/title\/(tt\d+)/g
                r = ''
                while (r = reg.exec(html)) {
                    imdb = r[1];
                }

                _updateDB(movie, duration, languages, pubdate, imdb, null).then(function () {
                    console.log('movie', movie.title + '\t updated!');
                    def.resolve();
                    updateImage(movie);
                });
            });

            return def.promise;
        },
        updateImage = function (movie) {
            if (movie.images && movie.images.medium) {
                baiduBucket.saveDouanImage(movie.images.medium, movie.id).then(function (filePath) {
                    mysql.query('update movies set baidu = ? where id = ?', [filePath, movie.id]);
                });
            }
        };

    that.add = function (id) {
        if (updateList[id]) return false;

        updateList[id] = 1;

        if (toUpdate++ == 0) {
            updateLoop();
        }
    };
    return that;
})();

exports.updateDB = _updateDB = function (movie, durations, languages, pubdate, imdb, baidu) {
    var def = Q.defer();

    mysql.connect(function (err, client) {
        var casts = [], directors = [];
        if (movie.casts && movie.casts.length) {
            var castParams = [], ar = [];
            for (var i = 0; i < movie.casts.length; i++) {
                var id = +movie.casts[i].id;
                if (id) {
                    castParams.push(movie.id);
                    castParams.push(+movie.casts[i].id);
                    castParams.push(movie.casts[i].name);
                    ar.push('(?,?,?)');
                    casts.push(movie.casts[i].name);
                }
            }
            if (ar.length > 0) client.append('insert into casts(movieId, id, name) values ' + ar.join(',') + ' on duplicate key update name=values(name) ', castParams);
        }

        if (movie.directors && movie.directors.length) {
            var castParams = [], ar = [];
            for (var i = 0; i < movie.directors.length; i++) {
                var id = +movie.directors[i].id;
                if (id) {
                    castParams.push(movie.id);
                    castParams.push(id);
                    castParams.push(movie.directors[i].name);
                    ar.push('(?,?,?)');
                    directors.push(movie.directors[i].name);
                }
            }
            if (ar.length > 0)  client.append('insert into directors(movieId, id, name) values ' + ar.join(',') + ' on duplicate key update name=values(name) ', castParams);
        }


        var sql = 'insert into movies(id, title, rating, ratings_count, subtype, year, genres, countries, summary, durations,languages, pubdate, imdb, baidu, casts, directors )'
            + 'values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
            + 'on duplicate key update   '
            + 'title = values(title),     '
            + 'rating = values(rating),'
            + 'ratings_count = values(ratings_count),'
            + 'subtype = values(subtype),             '
            + 'year = values(year),                    '
            + 'genres = values(genres),                 '
            + 'countries = values(countries),              '
            + 'summary = values(summary),'
            + 'durations = values(durations),'
            + 'languages = values(languages),'
            + 'pubdate = values(pubdate),'
            + 'imdb = values(imdb),'
            + 'baidu = values(baidu), '
            + 'casts = values(casts), '
            + 'directors = values(directors)';
        var rating = movie.rating ? movie.rating.average : 0;
        var genres = movie.genres ? movie.genres.join('/') : '';
        var countries = movie.countries ? movie.countries.join('/') : '';
        var params = [movie.id, movie.title, rating, movie.ratings_count || 0, movie.subtype, +movie.year || null, genres, countries, movie.summary
            , durations, languages, +pubdate || null, imdb, baidu
            , casts.join('/')
            , directors.join('/')];

        client.append(sql, params);

        client.runSql().finally(function () {
            def.resolve();
        });
    });
    return def.promise;
};

exports.check = function () {
    var ar = arguments[0];
    if (!util.isArray(ar)) {
        ar = [];
        for (var i = arguments.length; i--;) {
            ar.push(arguments[i]);
        }
    }
    mysql.query('select id from movies where id in (' + ar.join(',') + ')').then(function (results) {
        var obj = {};
        for (var i = results.length; i--;) {
            obj[results[i].id] = 1;
        }

        for (var i = ar.length; i--;) {
            if (!obj[ar[i]]) {
                movies.add(ar[i]);
            }
        }
    });
};

exports.tag = function (uid, type, tagId) {
    var sql;
    if (type == 'directors')
        sql = 'select                           \
        a.id,                                   \
        a.baidu,                                \
        a.rating,                               \
        a.title,                                \
        a.year,                                 \
        a.countries,                            \
        a.directors,                            \
        a.casts,                                \
        a.pubdate,                              \
        b.watch                                 \
    from movies a                               \
    inner join directors c on a.id = c.movieId  \
    inner join user_movie b on a.id = b.movieId \
    where b.userId = ? and c.id = ? \
     order by year desc, pubdate desc';

    if (type == 'casts')
        sql = '		select                           \
    a.id,                                        \
        a.baidu,                                 \
        a.rating,                                \
        a.title,                                 \
        a.year,                                  \
        a.countries,                             \
        a.directors,                             \
        a.casts,                                 \
        a.pubdate,                              \
        b.watch                                  \
    from movies a                                \
    inner join casts c on a.id = c.movieId       \
    inner join user_movie b on a.id = b.movieId  \
    where b.userId = ? and c.id = ? \
      order by year desc, pubdate desc';

    if (type == 'years')
        sql = "     \
    select                                               \
    a.id,                                                       \
        a.baidu,                                                \
        a.rating,                                               \
        a.title,                                                \
        a.year,                                                 \
        a.countries,                                            \
        a.directors,                                            \
        a.casts,                                                \
        a.pubdate,                              \
        b.watch                                                 \
    from movies a                                               \
    inner join user_movie b on a.id = b.movieId                 \
    where b.userId = ?                                      \
    and (a.year = ? or ('" + tagId + "' = '...' and a.year < 1980)\
    or ('" + tagId + "' = '80\\'s' and a.year between 1980 and 1989)     \
    or ('" + tagId + "' = '90\\'s' and a.year between 1990 and 1994)     \
    or ('" + tagId + "' = '95\\'s' and a.year between 1995 and 1999))" +
            " order by year desc, pubdate desc";

    if (type == 'watchTime')
        sql = 'select                               \
    a.id,                                       \
        a.baidu,                                \
        a.rating,                               \
        a.title,                                \
        a.year,                                 \
        a.countries,                            \
        a.directors,                            \
        a.casts,                                \
        a.pubdate,                              \
        b.watch                                 \
    from movies a                               \
    inner join user_movie b on a.id = b.movieId \
    where b.userId = ?                      \
    and cast(b.watch/100 as unsigned) = ? \
    order by year desc, pubdate desc';

    if (type == 'rate')
        sql = 'select                               \
            a.id,                                   \
            a.baidu,                                \
            a.rating,                               \
            a.title,                                \
            a.year,                                 \
            a.countries,                            \
            a.directors,                            \
            a.casts,                                \
            a.pubdate,                              \
            b.watch                                 \
        from movies a                               \
        inner join user_movie b on a.id = b.movieId \
        where b.userId = ?                          \
        and b.rating = ? \
        order by year desc, pubdate desc';

    if (type == 'countries') {
        sql = 'select                               \
            a.id,                                   \
            a.baidu,                                \
            a.rating,                               \
            a.title,                                \
            a.year,                                 \
            a.countries,                            \
            a.directors,                            \
            a.casts,                                \
            a.pubdate,                              \
            b.watch                                 \
        from movies a                               \
        inner join user_movie b on a.id = b.movieId \
        where b.userId = ?                          \
        and a.countries like ? \
        order by year desc, pubdate desc';
        tagId = tagId + '%';
    }

    if (type == 'genres') {
        sql = 'select                               \
            a.id,                                   \
            a.baidu,                                \
            a.rating,                               \
            a.title,                                \
            a.year,                                 \
            a.countries,                            \
            a.directors,                            \
            a.casts,                                \
            a.pubdate,                              \
            b.watch                                 \
        from movies a                               \
        inner join user_movie b on a.id = b.movieId \
        where b.userId = ?                          \
        and a.genres like ? \
        order by year desc, pubdate desc';
        tagId = tagId + '%';
    }

    var def = Q.defer();

    mysql.query(sql, [uid, tagId]).then(function (results) {

        results.forEach(function (item, i) {
            var rating = item.rating, starts = Math.floor(rating / 2);
            starts = (starts + (starts * 2 < rating ? 0.5 : 0)) * 10;
            item.rating = {stars: starts, average: rating};
            item.year = item.year + ' @ ' + item.countries;
        });

        def.resolve(results);
    });

    return def.promise;
};