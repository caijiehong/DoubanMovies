var httpHelp = require('../common/httpHelp.js'),
    mysql = require('../common/mysql.js'),
    Q = require('../lib/q.js'),
    movie = require('./movie.js');

exports.refresh = function (uid) {
    console.log('user [' + uid + '] begin!');
    var username, watched = {}, def = Q.defer(), dateUser = new Date(), appendList = [];
    def.promise.then(function () {
        console.log('user [' + uid + '] end cost ' + (new Date() - dateUser));
    });

    mysql.query('select movieId from user_movie where userId = ? order by watch desc', [uid]).then(function (result) {

        for (var i = result.length; i--;) {
            var item = result[i];
            watched[item.movieId] = 1;
        }
        readPage(0);
    });

    var updateDb = function () {
        mysql.connect(function (err, commands) {

            if (err) {
                return def.reject({connect: err});
            }

            var movieIds = [], b;
            for (var a, l; a = appendList.splice(0, 300), l = a.length, l > 0;) {
                b = new Array(l + 1).join(',(?,?,?,?)').substr(1);

                var params = [];
                for (var i = l; i--;) {
                    var item = a[i];
                    params = params.concat([uid, item.movieId, item.rating, item.watch]);
                    movieIds.push(item.movieId);
                }
                var sql = 'insert into user_movie(userId, movieId, rating, watch) values ' + b + ' on duplicate key update rating= values(rating), watch= values(watch)';

                commands.append(sql, params);
            }

            commands.runSql(true).then(function () {

                commands.append('insert into users(userId, username, totalMovies) select userId, ? as username, count(1) as totalMovies from user_movie where userId = ? on duplicate key update totalMovies=values(totalMovies)', [username, uid]);

                commands.runSql().then(function () {

                    movie.check(movieIds);

                    def.resolve();

                }, function (err) {
                    def.reject({err: 'users', detail: err});
                });
            }, function (err) {
                def.reject({err: 'user_movie', detail: err});
            })
        });
    };

    var readPage = function (index) {
        var pageUrl = "http://movie.douban.com/people/" + uid + "/collect?start=" + index + "&mode=list";
        httpHelp.get(pageUrl).then(function (data) {
            try {
                var reg, stop = false;
                reg = /([^<>]+)看过的电影/g;
                for (var r = null; r = reg.exec(data);) {
                    username = r[1].trim();
                }

                var ar = [];
                reg = /movie\.douban\.com\/subject\/(\d+)\//g;

                for (var r = null; r = reg.exec(data);) {
                    var id = +r[1];
                    if (watched[id]) {
                        stop = true;
                    } else {
                        var movie = {movieId: id};
                        ar.push(movie);
                    }
                }

                reg = /span class="rating(\d)-t"><\/span>[^\/]*(\d{4}-\d{2}-\d{2})/g;
                for (var r = null, i = 0; r = reg.exec(data);) {
                    var rating = 0;
                    var watch = null;
                    if (r[1]) {
                        rating = parseInt(r[1]);
                    }
                    if (r[2]) {
                        watch = parseInt(r[2].replace(/-/g, ''));
                    }
                    if (!ar[i]) {
                        break;
                    }
                    ar[i].rating = rating;
                    ar[i].watch = watch;
                    i++;
                }
                appendList = appendList.concat(ar);

                if (i > 0 && !stop) {
                    Q.delay(100).then(function () {
                        readPage(index + 30);
                    });
                } else if (appendList.length) {
                    updateDb();
                } else {
                    def.resolve();
                }
            } catch (err) {
                def.reject({err: err, data: data});
            }
        }, function (err) {
            def.reject(err);
        });
    };

    return def.promise;
};

exports.top = function (topN) {
    var sql = 'select userId, username as userName, totalMovies as totalWatch from users order by totalMovies desc limit ?;'
    return mysql.query(sql, [topN]);
};

exports.data = function (uid) {
    var def = Q.defer();

    mysql.connect(function (err, commands) {

        commands.append('select sum(durations) as totalDuration from movies a inner join user_movie b on a.id = b.movieId where b.userId = ?;', [uid]);

        commands.append('select b.rating, count(1) as total from user_movie b where b.userId = ? and b.rating > 0 group by b.rating order by b.rating desc;', [uid]);

        commands.append('select FLOOR(b.watch / 100) as watchTime, count(1) as total from user_movie b where b.userId = ? and b.watch > 0 group by watchTime order by watchTime desc;', [uid]);

        commands.append('select avg(rating) as averageRate, count(case when rating > 0 then 1 else 0 end) as rateCount from user_movie where userId = ?;', [uid]);

        commands.append('select id, name , count(1) as total from casts a inner join user_movie b on a.movieId = b.movieId ' +
            'where b.userId = ? group by a.id, a.name order by total desc limit 20;', [uid]);

        commands.append('select id, name , count(1) as total from directors a inner join user_movie b on a.movieId = b.movieId ' +
            'where b.userId = ?  group by a.id, a.name order by total desc limit 20;', [uid]);

        commands.append('select b.year as years, count(1) as total  from user_movie a inner join movies b on a.movieId = b.id ' +
            'where a.userId = ? and b.year > 0 group by years order by years desc;', [uid]);

        commands.append('select b.countries,count(1) as total from user_movie a inner join movies b on a.movieId = b.id   ' +
            'where a.userId = ? and length(b.countries) > 0 group by b.countries order by total desc limit 100;', [uid]);

        commands.append('select b.genres,count(1) as total from user_movie a inner join movies b on a.movieId = b.id  ' +
            'where a.userId = ? and length(b.countries) > 0 group by b.genres order by total desc limit 100;', [uid]);

        commands.append('select userId, username, totalMovies from users where userId = ?', [uid]);

        var onComplete = function (tbDuration, tbRating, tbWatchTime, tbSum, tbCasts, tbDirectors, tbYears, tbCountries, tbGenres, tbUser) {

            var _t = {
                totalDuration: 0,
                totalWatch: 0,
                averageRate: 0,
                rateCount: 0,
                userName: uid,
                rate: [
                    ['5星', 0],
                    ['4星', 0],
                    ['3星', 0],
                    ['2星', 0],
                    ['1星', 0]
                ],
                watchTime: [],
                casts: [],
                directors: [],
                years: [],
                countries: [],
                genres: []
            };

            _t.totalDuration = tbDuration[0].totalDuration;
            for (var i = 0; i < 5; i++) {
                _t.rate[tbRating[i].rating - 1][1] = tbRating[i].total;
            }

            _t.averageRate = tbSum[0].averageRate;
            _t.rateCount = tbSum[0].rateCount;
            _t.userName = tbUser[0].username;
            _t.totalWatch = tbUser[0].totalMovies;


            for (var i = tbWatchTime.length; i--;) {
                var item = tbWatchTime[i];
                _t.watchTime.unshift([item.watchTime, item.total]);
            }

            for (var i = tbCasts.length; i--;) {
                var item = tbCasts[i];
                _t.casts.unshift([item.name, item.total, item.id]);
            }

            for (var i = tbDirectors.length; i--;) {
                var item = tbDirectors[i];
                _t.directors.unshift([item.name, item.total, item.id]);
            }

            var s95 = 0, s90 = 0, s80 = 0, more = 0;
            for (var i = tbYears.length; i--;) {
                var item = tbYears[i];
                if (item.years < 1980) {
                    more += item.total;
                } else if (item.years < 1990) {
                    s80 += item.total;
                } else if (item.years < 1995) {
                    s90 += item.total;
                } else if (item.years < 2000) {
                    s95 += item.total;
                } else {
                    _t.years.unshift([item.years.toString(), item.total]);
                }
            }
            _t.years = _t.years.concat([
                ['95\'s', s95],
                ['90\'s', s90],
                ['80\'s', s80],
                ['...', more]
            ]);


            var countries = {};
            tbCountries.forEach(function (item, i) {
                var ar = item.countries.split('/');
                ar.forEach(function (c) {
                    countries[c] = (countries[c] || 0) + item.total;
                });
            });

            for (var c in countries) {
                _t.countries.push([c, countries[c]])
            }
            _t.countries = _t.countries.sort(function (a, b) {
                return b[1] - a[1];
            }).slice(0, 10);


            var genres = {};
            tbGenres.forEach(function (item, i) {
                var ar = item.genres.split('/');
                ar.forEach(function (c) {
                    genres[c] = (genres[c] || 0) + item.total;
                });
            });

            for (var c in genres) {
                _t.genres.push([c, genres[c]])
            }
            _t.genres = _t.genres.sort(function (a, b) {
                return b[1] - a[1];
            }).slice(0, 10);

            def.resolve(_t);
        };

        commands.runSql().spread(onComplete, function (err) {
            def.reject(err);
        });
    });

    return def.promise;
};