
var doubanAPIKey = '02b703f49616c50a08250bddc2444f1e';

var http = require('http'),
    events = require("events"),
    mongoDA = require('../mongo/mongoDA.js'),
    doubanDA = require('../mongo/doubanDA.js');

exports.get = function (req, res, action) {
    render_index(req, res, action);
}
exports.post = function (req, res, action) {

    var user = req.body['user'];
    switch (action) {
        case 'data': {
            render_data(req, res, user);
            break;
        }
        case 'update': {
            render_update(req, res, user);
            break;
        }
        default:

    }
}

var render_index = function (req, res, user) {
    res.render('index', { user: user });
};

var render_data = function (req, res, user) {

    doubanDA.collection('users', function (users) {
        users.find({ user: user }, { _id: 0, rate: 1, date: 1, id: 1 }).toArray(function (err, item) {
            if (err) {
                console.log(err)
                return;
            }

            userMovies(item, function (userMovie) {

                res.send(userMovie);
            });
        })
    });

};

var render_update = function (req, res, user) {

    var status = userUpdateList.check(user);

    switch (status) {
        case userUpdateList.status_NotFound:
            {
                res.send('Just put in queue!');
                return;
            }
        case userUpdateList.status_InQueue:
            {
                res.send('Already in queue!');
                return;
            }
        case userUpdateList.status_Reading:
            {
                res.send('Already reading!');
                return;
            }
        default:

    }
}

function userMovies(userInfo, onUserLoaded) {

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

        _t.rate = rateAr.sort(function (a, b) { a.rate - b.rate });

        _t.watchTime = [];
        for (var key in watchTime) {
            _t.watchTime.push({ month: key, count: watchTime[key] });
        }
        _t.watchTime = _t.watchTime.sort(function (a, b) { return b.month - a.month; });

        _t.averageRate = _t.averageRate / _t.rateCount;

        doubanDA.collection('movies', function (movies) {

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

                        dirAr = dirAr.sort(function (a, b) { return b.count - a.count });
                        _t.directors = [];
                        for (var i = 0; i < 30; i++) {
                            _t.directors.push(dirAr[i]);
                        }

                        dirAr = [];
                        for (var dir in result1[0].casts) {
                            dirAr.push({ cast: dir, count: result1[0].casts[dir] });
                        }

                        dirAr = dirAr.sort(function (a, b) { return b.count - a.count });
                        _t.casts = [];
                        for (var i = 0; i < 30; i++) {
                            _t.casts.push(dirAr[i]);
                        }

                        dirAr = [];
                        for (var dir in result1[0].genres) {
                            dirAr.push({ genre: dir, count: result1[0].genres[dir] });
                        }

                        dirAr = dirAr.sort(function (a, b) { return b.count - a.count });
                        _t.genres = [];
                        for (var i = 0; i < 20; i++) {
                            _t.genres.push(dirAr[i]);
                        }

                        dirAr = [];
                        for (var dir in result1[0].countries) {
                            dirAr.push({ country: dir, count: result1[0].countries[dir] });
                        }

                        dirAr = dirAr.sort(function (a, b) { return b.count - a.count });
                        _t.countries = [];
                        for (var i = 0; i < 20; i++) {
                            _t.countries.push(dirAr[i]);
                        }
                    }

                    movies.group(['year'], { id: { $in: watchList }, year: { $ne: '' } }, { count: 0 },
                    function (obj, prev) { prev.count++; }, true,
                    function (err2, result2) {

                        _t.years = result2.sort(function (a, b) { return b.year - a.year });

                        onUserLoaded(_t);
                    });

                });
        });
    }
}

var userUpdateList = new (function () {
    var userList = [];

    this.status_NotFound = 0;
    this.status_InQueue = 1;
    this.status_Reading = 2;
    this.status_Done = 3;

    this.check = function (user) {
        for (var i = 0; i < userList.length; i++) {
            var item = userList[i];
            if (item.user == user) {
                return item.status;
            }
        }
        userList.push({ user: user, status: this.status_InQueue });


        return this.status_NotFound;
    }

    this.readIsDone = function (user) {
        if (userList.length > 0 && userList[0].status == this.status_Reading) {
            userList.shift();
        }
    }

    function readLoop() {

        if (userList.length > 0) {
            var item = userList[0];

            switch (item.status) {
                case userUpdateList.status_InQueue:
                    {
                        item.status = userUpdateList.status_Reading;

                        console.log('user: ' + item.user + ' begin!');
                        var doubanUser = new DoubanUser(item.user);
                        doubanUser.start();
                        break;
                    }
                default:

            }
        }


        setTimeout(readLoop, 500);
    }

    readLoop();
})();

//创建一个EventEmitter的实例
var tweets_emitter = new events.EventEmitter();


var DoubanUser = function (user) {
    var _t = this;
    var startIndex = 0;
    var readCount = 0;
    this.deepRead = false;

    var needSpider = false;
    var watchList = [];
    var watched = {};
    var readUser = user;

    this.start = function () {
        doubanDA.collection('users', function (users) {
            users.find({ user: readUser }, { _id: 0, rate: 1, date: 1, id: 1, user: 1 }).toArray(function (err, item) {
                if (!err && item) {
                    console.log('user:' + readUser + ' has:' + item.length)
                    watchList = item;
                    for (var i = 0; i < item.length; i++) {
                        watched[item[i].id.toString()] = true;
                    }
                }
                readList(0);
            });
        });
    }

    var updateDB = function () {
        doubanDA.collection('users', function (users) {
            users.remove({ user: readUser }, { w: 1 }, function () {
                users.insert(watchList, { w: 1 }, function () {
                    console.log('user:' + user + ' updated:' + watchList.length);
                });
            });
        });

        userUpdateList.readIsDone(readUser);
    }

    var readList = function (begin) {
        if (begin) {
            startIndex = begin;
        }
        var pageUrl = 'http://movie.douban.com/people/' + user + '/collect?start=' + startIndex + '&mode=list';


        httpHelp.read(pageUrl, function (data) {
            var ar = [];
            for (var i = data.indexOf('<div class="date">') ; i > -1;) {
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
                console.log(readUser + ' read url :' + movieUrls.length + ' total : ' + watchList.length);

                var stop = false;

                for (var i = 0; i < movieUrls.length; i++) {
                    var item = movieUrls[i];
                    var id = item.match(/\d+/)[0];

                    movieHelp.checkDoubanId(id);

                    if (watched[id.toString()]) {
                        stop = true;
                    } else {
                        ar[i].id = id;
                        watchList.push(ar[i]);
                    }
                }
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
}


var httpHelp = new (function () {

    this.read = function (url, callback) {
        var buf = '';
        http.get(url, function (res) {
            res.setEncoding('utf8');

            res.on('data', function (chunk) {
                buf += chunk;
            }).on('end', function () {
                callback(buf);
            });
        }).on('error', function (e) {
            console.log("Got error: " + e.message);
        });
    }

})();

var movieHelp = new (function () {
    var readList = [];

    this.checkDoubanId = function (doubanId) {
        doubanDA.collection('movies', function (movies) {
            movies.findOne({ id: doubanId }, function (err, item) {
                if (!err && !item) {
                    readList.push(doubanId.toString());
                }
            });
        });
    }

    function readLoop() {
        if (readList.length > 0) {
            var doubanId = readList.shift();
            var url = 'http://api.douban.com/v2/movie/subject/' + doubanId + '?apikey=' + doubanAPIKey;
            httpHelp.read(url, function (data) {

                var movie = JSON.parse(data);
                doubanDA.collection('movies', function (movies) {
                    console.log('[title]\t' + movie.title);
                    movies.remove({ id: doubanId }, { w: 1 }, function () {
                        movies.insert(movie, { w: 1 }, function (err, result) {
                            if (!err) {
                                readDoubanInfo_Old(doubanId)
                            }
                        });
                    });
                });
            });
        }

        setTimeout(readLoop, 5500);
    }

    function readDoubanInfo_Old(doubanId) {
        var url = 'http://api.douban.com/movie/subject/' + doubanId + '?alt=json&apikey=' + doubanAPIKey;
        httpHelp.read(url, function (data) {
            try {
                var movie = JSON.parse(data);

                var attributes = movie['db:attribute'];
                var languages = [];
                var duration = 0;
                var pubdate = '';

                for (var i = 0; i < attributes.length; i++) {
                    var item = attributes[i];
                    var key = item['@name'];
                    var value = item['$t']
                    switch (key) {
                        case 'movie_duration': {
                            var num = value.match(/\d+/);
                            if (num) {
                                duration = parseInt(num[0]);
                            }
                            break;
                        }
                        case 'language': languages.push(value); break;
                        case 'pubdate': pubdate = parseInt(dateHelper.formatDate(new Date(value), 'YYYYMMdd')); break;
                        default: break;
                    }
                }

                doubanDA.collection('movies', function (movies) {
                    var movie = JSON.parse(data);
                    movies.update({ id: doubanId.toString() }, { $set: { languages: languages, duration: duration, pubdate: pubdate } }, { w: 1 }, function (err, result) {
                    });
                });
            } catch (er) {
                return;
            }
        });
    }

    readLoop();
})();