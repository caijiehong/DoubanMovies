var httpHelp = require('../common/httpHelp')
    , doubanMovies = require('./doubanMovie.js')
    , events = require('events')
    , Mongoda = require('./mongoda')
    , settings = require('../settings');

var userUpdateList = {};

exports.userStatus = userStatus = {
    status_NotFound: 0,
    status_InQueue: 1,
    status_Reading: 2,
    status_Done: 3
};

exports.data = function (user, onDataLoad) {
    new Mongoda(settings.dbUrl).open(function (err, db) {
        if (err) return;

        var users = db.collection('users');
        var movies = db.collection('movies');

        users.find({ user: user }, { _id: 0, rate: 1, date: 1, id: 1 }).toArray(function (err, userInfo) {

            var _t = {};
            _t.totalDuration = 0;
            _t.totalWatch = 0;
            _t.averageRate = 0;
            _t.rateCount = 0;
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
                                db.close();
                                onDataLoad(_t);
                            });

                    });
            }
        })
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
    readLoopUser();
}

function readLoopUser() {
    var douban_user_id;
    for (var i in userUpdateList) {
        douban_user_id = i;
        break;
    }

    if (douban_user_id) {
        new DoubanUser(douban_user_id).on('update', function () {
            console.log(douban_user_id +' update success!')
            delete userUpdateList[douban_user_id];
            setTimeout(readLoopUser, 100);
        });
    } else {
        setTimeout(readLoopUser, 500);
    }
}

var DoubanUser = function (user) {
    var _t = this;
    var startIndex = 0;

    var eve = new events.EventEmitter();

    this.on = function (event, listener) {
        eve.on(event, listener);
        return this;
    };

    var watchList = [];
    var watched = {};
    var readUser = user;
    var totalWatched = 0;

    new Mongoda(settings.dbUrl).open(function (err, db) {
        var users = db.collection('users');
        users.find({ user: readUser }, { _id: 0, rate: 1, date: 1, id: 1, user: 1 })
            .toArray(function (err, item) {
                db.close();

                if (!err && item) {
                    watchList = item;
                    for (var i = 0; i < item.length; i++) {
                        watched[item[i].id.toString()] = true;
                    }
                }
                readList(0);
            });
    });

    var updateDB = function () {
        new Mongoda(settings.dbUrl).open(function (err, db) {
            if (err) return;

            var users = db.collection('users');

            users.remove({ user: readUser }, { w: 1 }, function () {
                users.insert(watchList, { w: 1 }, function () {
                    db.close();
                });
            });
        });

        eve.emit('update');
    }

    var readList = function (begin) {
        if (begin) {
            startIndex = begin;
        }
        var pageUrl = 'http://movie.douban.com/people/' + user + '/collect?start=' + startIndex + '&mode=list';

        httpHelp.get(pageUrl, function (data) {
            totalWatched = Number(data.match(/看过的电影\(\d+\)/)[0].match(/\d+/)[0]);

            var ar = [];
            for (var i = data.indexOf('<div class="date">'); i > -1;) {
                var j = data.indexOf('</div>', i);
                var sub = data.substring(i, j);

                var rate = sub.match(/\d-t"/);

                rate = !rate ? 0 : parseInt(rate[0]);
                var tempSub = sub.match(/\d{4}-\d{2}-\d{2}/)[0].replace(/-/g, '');

                ar.push({ user: user, rate: rate, date: parseInt(tempSub) });

                i = data.indexOf('<div class="date">', i + 1);
            }

            var movieUrls = data.match(/http:\/\/movie.douban.com\/subject\/\d+\//g);

            if (movieUrls) {

                var stop = false;
                var idList = [];

                for (var i = 0; i < movieUrls.length; i++) {
                    var item = movieUrls[i];
                    var id = item.match(/\d+/)[0];
                    idList.push(id)

                    if (watched[id.toString()]) {
                        stop = true;
                    } else {
                        ar[i].id = id;
                        watchList.push(ar[i]);
                    }
                }
                doubanMovies.checkList(idList);
                if (stop) {
                    updateDB();
                    return;
                }

                startIndex += 30;
                setTimeout(readList, (1000 * 1));
            } else {
                updateDB();
            }
        });

    }

    return this;
};

