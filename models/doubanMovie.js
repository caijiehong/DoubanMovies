var settings = require('../settings')
    , httpHelp = require('../common/httpHelp')
    , dateHelp = require('../common/dateHelp')
    , doubanUser = require('./doubanUser');

var movieUpdateList = {};
var mongoda = null;

exports.check = function (doubanId) {
    doubanId = doubanId.toString();

    if (movieUpdateList[doubanId]) {
        return;
    }

    mongoda.pop().collection('movies', function (movies) {
        movies.findOne({ id: doubanId }, function (err, item) {

            if (!err && !item) {
                movieUpdateList[doubanId] = 1;
            }
        });
    });
};

exports.checkList = checkList = function (checkArr) {
    var dba = mongoda.pop()
    dba.collection('movies', function (movies) {
        movies.group([], {
            id: {
                $in: checkArr
            }
        }, {
            listIn: {}
        }, (function (obj, prev) {
            return prev.listIn[obj.id] = true;
        }), true, function (err1, result1) {
            var doubanId, item, lostArray, _i, _len;

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
                movieUpdateList[doubanId] = 1;
            }
            return true;
        });
    });
};

exports.updateMovie = updateMovie = function (doubanId, onUpdated) {

    var url = 'http://api.douban.com/v2/movie/subject/' + doubanId + '?apikey=' + settings.doubanAPIKey;
    httpHelp.get(url, function (data) {
        try {

            var movie = JSON.parse(data);

            mongoda.pop().collection('movies', function (movies) {
                movies.update({id: movie.id}
                    , movie
                    , {safe: true, upsert: true}
                    , function (err) {
                    readDoubanPage(doubanId, function (languages, duration, pubdate) {

                        movies.update({ id: movie.id }
                            , { $set: { languages: languages, duration: duration, pubdate: pubdate } }
                            , { w: 1 }
                            , onUpdated);

                    });
                });
            });
        } catch (err) {
            console.log('doubanMovie', data);
            onUpdated();
        }
    });
};

exports.init = function () {
    console.log('Init', 'doubanMovie');

    mongoda = new require('./dbPool')(settings.dbUrl, 1);

    readLoopMovie();

    setInterval(readLoopMovie, 1000 * 5);
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
        while (r = reg.exec(html)) {
            duration = parseInt(r[1]);
        }

        var reg = /<span class="pl">语言:<\/span>([^<]+)/g;
        var r = ''
        while (r = reg.exec(html)) {
            var temp = r[1].split('/');
            for (var i = 0; i < temp.length; i++) {
                var item = temp[i].trim();
                if (item) {
                    languages.push(item);
                }
            }
        }

        var reg = /<span property="v:initialReleaseDate" content="(\d{4}-\d{2}-\d{2})/g;
        var r = ''
        while (r = reg.exec(html)) {
            pubdate = parseInt(dateHelp.formatDate(new Date(r[1]), 'YYYYMMdd'));
        }

        onPageRead(languages, duration, pubdate);
    });
}

function readLoopMovie() {
    var doubanId;
    for (var i in movieUpdateList) {
        if (movieUpdateList[i] == 1) {
            movieUpdateList[i] = 2;
            doubanId = i;
            break;
        }
    }

    if (doubanId) {
        console.log('[movie]: ' + doubanId + ' begin!');

        try {
            updateMovie(doubanId, function () {
                console.log('[movie]: ' + doubanId + ' end!');

                delete movieUpdateList[doubanId];
            });
        } catch (err) {
            console.error('doubanMovie', err)
        }
    }
}

exports.readFrontPage = function readFrontPage() {

    console.log('doubanMovie', 'read front page');

    var url = 'http://movie.douban.com';
    httpHelp.get(url, function (html) {

        var movieList = [];
        var reg = /movie\.douban\.com\/subject\/(\d+)\//g;
        var r = null;
        while (r = reg.exec(html)) {
            movieList.push(r[1]);
        }

        checkList(movieList);

        var userList = {};

        var reg = /movie\.douban\.com\/people\/([\w]+)\//g;
        var r = null;
        while (r = reg.exec(html)) {
            userList[r[1]] = true;
        }
        for (var key in userList) {
            doubanUser.update(key);
        }
    });
}