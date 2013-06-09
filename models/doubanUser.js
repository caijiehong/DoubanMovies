var httpHelp = require('../common/httpHelp')
    , doubanMovies = require('./doubanMovie.js')
    , events = require('events')
    , settings = require('../settings');

var userUpdateList = {};
var mongoda = null;

exports.userStatus = userStatus = {
    status_NotFound: 0,
    status_InQueue: 1,
    status_Reading: 2,
    status_Done: 3
};

exports.data = function (user, onDataLoad) {
    mongoda.pop().collection('douUsers', function (douUsers) {

        douUsers.findOne({ userId: user }, function (err, userItem) {

            var _t = {};
            _t.totalDuration = 0;
            _t.totalWatch = 0;
            _t.averageRate = 0;
            _t.rateCount = 0;
            _t.userName = user;

            if (err) {
                onDataLoad(_t);
                return;
            }
            if(!userItem || !userItem.movies){
                userUpdateList[user] = true;
                return;
            }
            _t.userName = userItem.userName || userItem.userId;

            var userInfo = userItem.movies;
            var watchTime = {};

            if (userInfo) {
                _t.totalWatch = userInfo.length;
                var watchList = [];

                var rateList = {};

                for (var i = 0; i < userInfo.length; i++) {
                    var item = userInfo[i];
                    if (item.rate > 0) {
                        _t.averageRate += item.rate;
                        _t.rateCount++;
                    }

                    if (rateList[item.rate]) {
                        rateList[item.rate].count++;
                    } else {
                        rateList[item.rate] = { rate: item.rate, count: 1 };
                    }


                    var month = parseInt(item.date / 100);
                    watchTime[month] = watchTime[month] ? (watchTime[month] + 1) : 1;
                    watchList.push(item.id);
                }

                var rateAr = [];
                for (var i in rateList) {
                    rateAr.push(rateList[i]);
                }

                _t.rate = rateAr.sort(function (a, b) {
                    a.rate - b.rate
                });

                _t.watchTime = [];
                for (var key in watchTime) {
                    _t.watchTime.push({ month: key, count: watchTime[key] });
                }
                _t.watchTime = _t.watchTime.sort(function (a, b) {
                    return b.month - a.month;
                });

                _t.averageRate = _t.averageRate / _t.rateCount;

                mongoda.pop().collection('movies', function (movies) {
                    movies.group([], { id: { $in: watchList } }, { totalDur: 0, directors: {}, casts: {}, genres: {}, countries: {} },
                        function (obj, prev) {
                            prev.totalDur += obj.duration || 0;

                            if (obj.directors) {
                                for (var i = 0; i < obj.directors.length; i++) {
                                    var dir = obj.directors[i].name;
                                    if (dir) {
                                        prev.directors[dir] = prev.directors[dir] ? (prev.directors[dir] + 1) : 1;
                                    }
                                }
                            }

                            if (obj.casts) {
                                for (var i = 0; i < obj.casts.length; i++) {
                                    var dir = obj.casts[i].name;
                                    if (dir) {
                                        prev.casts[dir] = prev.casts[dir] ? (prev.casts[dir] + 1) : 1;
                                    }
                                }
                            }

                            if (obj.genres) {
                                for (var i = 0; i < obj.genres.length; i++) {
                                    var dir = obj.genres[i];
                                    if (dir) {
                                        prev.genres[dir] = prev.genres[dir] ? (prev.genres[dir] + 1) : 1;
                                    }
                                }
                            }

                            if (obj.countries) {
                                for (var i = 0; i < obj.countries.length; i++) {
                                    var dir = obj.countries[i];
                                    if (dir) {
                                        prev.countries[dir] = prev.countries[dir] ? (prev.countries[dir] + 1) : 1;
                                        break;
                                    }
                                }
                            }
                        }, true,
                        function (err1, result1) {

                            if (result1.length > 0) {
                                _t.totalDuration = result1[0].totalDur;
                                var dirAr = [];
                                for (var dir in result1[0].directors) {
                                    dirAr.push({ director: dir, count: result1[0].directors[dir] });
                                }

                                dirAr = dirAr.sort(function (a, b) {
                                    return b.count - a.count
                                });
                                _t.directors = [];
                                for (var i = 0; i < 30; i++) {
                                    _t.directors.push(dirAr[i]);
                                }

                                dirAr = [];
                                for (var dir in result1[0].casts) {
                                    dirAr.push({ cast: dir, count: result1[0].casts[dir] });
                                }

                                dirAr = dirAr.sort(function (a, b) {
                                    return b.count - a.count
                                });
                                _t.casts = [];
                                for (var i = 0; i < 30; i++) {
                                    _t.casts.push(dirAr[i]);
                                }

                                dirAr = [];
                                for (var dir in result1[0].genres) {
                                    dirAr.push({ genre: dir, count: result1[0].genres[dir] });
                                }

                                dirAr = dirAr.sort(function (a, b) {
                                    return b.count - a.count
                                });
                                _t.genres = [];
                                for (var i = 0; i < 20; i++) {
                                    _t.genres.push(dirAr[i]);
                                }

                                dirAr = [];
                                for (var dir in result1[0].countries) {
                                    dirAr.push({ country: dir, count: result1[0].countries[dir] });
                                }

                                dirAr = dirAr.sort(function (a, b) {
                                    return b.count - a.count
                                });
                                _t.countries = [];
                                for (var i = 0; i < 20; i++) {
                                    _t.countries.push(dirAr[i]);
                                }
                            }

                            movies.group(['year'], { id: { $in: watchList }, year: { $ne: '' } }, { count: 0 },
                                function (obj, prev) {
                                    prev.count++;
                                }, true,
                                function (err2, result2) {

                                    if (result2) {
                                        _t.years = result2.sort(function (a, b) {
                                            return b.year - a.year
                                        });
                                    }
                                    onDataLoad(_t);
                                });

                        });
                });
            }
        });
    });
};

exports.update = function (douban_user_id) {
    if (userUpdateList[douban_user_id]) {
        return userUpdateList[douban_user_id].status;
    }

    userUpdateList[douban_user_id] = { user: douban_user_id, status: userStatus.status_InQueue};

    return userStatus.status_NotFound;
}

exports.init = function () {
    console.log('Init', 'doubanUser');
    mongoda = new require('./dbPool')(settings.dbUrl, 1);
    readLoopUser();
}

exports.top = function (topN, onDataLoad) {
    mongoda.pop().collection('douUsers', function (douUsers) {
        var cur = douUsers.find({}, {userId: 1, userName: 1, totalWatch: 1, _id: 0}, {limit: topN, sort: {'totalWatch': -1}});
        cur.toArray(function (err, results) {
            onDataLoad(results);
        });
    });
};

function readLoopUser() {
    var douban_user_id;
    for (var i in userUpdateList) {
        douban_user_id = i;
        break;
    }

    if (douban_user_id) {
        console.log(douban_user_id + ' update begin!')
        new DoubanUser(douban_user_id).on('update', function () {
            console.log(douban_user_id + ' update success!')
            delete userUpdateList[douban_user_id];
            setTimeout(readLoopUser, 100);
        });
    } else {
        setTimeout(readLoopUser, 500);
    }
}

var DoubanUser = function (userId) {
    var _t = this;
    var startIndex = 0;

    var eve = new events.EventEmitter();

    this.on = function (event, listener) {
        eve.on(event, listener);
        return this;
    };

    var watchList = [];
    var watched = {};
    var readUser = userId;
    var doubanName = ''

    mongoda.pop().collection('douUsers', function (douUsers) {
        douUsers.findOne({ userId: readUser }, function (err, item) {
            if (!err && item) {
                watchList = item.movies || [];
                for (var i = 0; i < watchList.length; i++) {
                    watched[watchList[i].id] = true;
                }
            }
            readList(0);
        });
    });

    var updateDB = function () {
        var toCheckList = [];
        for (var i = 0; i < watchList.length; i++) {
            toCheckList.push(watchList[i].id);
        }
        doubanMovies.checkList(toCheckList);

        mongoda.pop().collection('douUsers', function (douUsers) {
            douUsers.update({userId: userId}
                , {userId: userId, userName: doubanName, movies: watchList, totalWatch: watchList.length}
                , {safe: true, upsert: true}, function () {
                });
        });


        eve.emit('update');
    }

    var readList = function (begin) {
        try {
            if (begin) {
                startIndex = begin;
            }
            var pageUrl = 'http://movie.douban.com/people/' + userId + '/collect?start=' + startIndex + '&mode=list';

            httpHelp.get(pageUrl, function (data) {
                var stop = false;

                var reg = /([^<>]+)看过的电影/g;
                var r = null
                while (r = reg.exec(data)) {
                    doubanName = r[1].trim();
                }

                var ar = [];

                var reg = /movie\.douban\.com\/subject\/(\d+)\//g
                var r = null
                while (r = reg.exec(data)) {
                    var id = r[1];
                    if (watched[id]) {
                        stop = true;
                    } else {
                        var movie = {id: id};
                        ar.push(movie);
                        watchList.push(movie);
                    }
                }

                var reg = /span class="rating(\d)-t"><\/span>[^\/]*(\d{4}-\d{2}-\d{2})/g
                var r = null
                var i = 0;
                while (r = reg.exec(data)) {
                    var rate = 0;
                    var date = ''
                    if (r[1]) {
                        rate = parseInt(r[1])
                    }
                    if (r[2]) {
                        date = parseInt(r[2].replace(/-/g, ''))
                    }
                    if (!ar[i]) {
                        break;
                    }
                    ar[i].rate = rate;
                    ar[i].date = date;
                    i++;
                }

                if (i == 0 || stop) {
                    updateDB();
                    return;
                } else {
                    startIndex += 30;
                    setTimeout(readList, (1000 * 1));
                }
            });
        } catch (err) {
            eve.emit('update');
        }
    }

    return this;
};

