var Mongoda = require('./mongoda')
    , httpHelp = require('../common/httpHelp')
    , dateHelp = require('../common/dateHelp')
    , settings = require('../settings');

var movieUpdateList = {};

exports.check = function (doubanId) {
    doubanId = doubanId.toString();

    if (movieUpdateList[doubanId]) {
        return;
    }

    new Mongoda(settings.dbUrl).open(function (err, db) {
        if (err) return;

        var movies = db.collection('movies');

        movies.findOne({ id: doubanId }, function (err, item) {
            db.close();

            if (!err && !item) {
                movieUpdateList[doubanId] = true;
            }
        });
    });
};

exports.checkList = function (checkArr) {
    var da;
    da = new Mongoda(settings.dbUrl);
    return da.open(function (err, db) {
        var movies, res;
        movies = db.collection('movies');
        return res = movies.group([], {
            id: {
                $in: checkArr
            }
        }, {
            listIn: {}
        }, (function (obj, prev) {
            return prev.listIn[obj.id] = true;
        }), true, function (err1, result1) {
            var doubanId, item, lostArray, _i, _len;
            db.close();
            lostArray = result1.length === 0 ? checkArr : (function () {
                var _i, _len, _results;
                _results = [];
                for (_i = 0, _len = checkArr.length; _i < _len; _i++) {
                    item = checkArr[_i];
                    if (!result1[0].listIn[item]) {
                        _results.push(item);
                    }
                }
                return _results;
            })();
            for (_i = 0, _len = lostArray.length; _i < _len; _i++) {
                doubanId = lostArray[_i];
                movieUpdateList[doubanId] = true;
            }
            return true;
        });
    });
};

exports.updateMovie = updateMovie = function (doubanId, onUpdated) {
    console.log('[movie]: ' + doubanId + ' begin!');

    var url = 'http://api.douban.com/v2/movie/subject/' + doubanId + '?apikey=' + settings.doubanAPIKey;
    httpHelp.get(url, function (data) {

        var movie = JSON.parse(data);

        new Mongoda(settings.dbUrl).open(function (err, db) {
            if (err) {
                console.error(err);
                return;
            }
            if (!movie.id) {
                console.error('readError', movie);
                return
            }

            var movies = db.collection('movies');

            movies.update({id: movie.id}, movie, {safe: true, upsert: true}, function (err) {
                readDoubanPage(doubanId, function (languages, duration, pubdate) {

                    db.close();
                    movies.update({ id: movie.id }, { $set: { languages: languages, duration: duration, pubdate: pubdate } }, { w: 1 }, onUpdated);
                    console.log('[movie]: ' + doubanId + ' end!');
                });
            });
        });
    });
};

exports.init = function () {
    readLoopMovie();
};

function readDoubanPage(doubanId, onPageRead) {
    var url = 'http://movie.douban.com/subject/' + doubanId + '/';
    httpHelp.get(url, function (html) {
        var duration = 0;
        var languages = [];
        var pubdate = 0;
        html = html.replace(/\n/g, '');

        var reg = /<span property="v:runtime" content="(\d+)/g;
        var r = ''
        while(r = reg.exec(html)){
            duration = parseInt(r[1]);
        }

        var reg = /<label>语言<\/label>([^<]+)<\/li>/g
        var r = ''
        while(r = reg.exec(html)){
            languages.push(r[1].trim());
        }

        var reg = /<span property="v:initialReleaseDate" content="(\d{4}-\d{2}-\d{2})/g;
        var r = ''
        while(r = reg.exec(html)){
            pubdate = parseInt(dateHelp.formatDate(new Date(r[1]), 'YYYYMMdd'));
        }

        onPageRead(languages, duration, pubdate);
    });
}

function readLoopMovie() {
    var doubanId;
    for (var i in movieUpdateList) {
        doubanId = i;
        break;
    }

    if (doubanId) {
        updateMovie(doubanId, function () {
            delete movieUpdateList[doubanId];

            setTimeout(readLoopMovie, 5500);
        });
    } else {
        setTimeout(readLoopMovie, 500);
    }
}


