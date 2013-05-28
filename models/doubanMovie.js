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

    new Mongoda().open(function (err, db) {
        if (err) {
            console.err(err);
            return;
        }

        var movies = db.collection('movies');

        movies.findOne({ id: doubanId }, function (err, item) {
            db.close();

            if (!err && !item) {
                movieUpdateList[doubanId] = true;
            }
        });
    });
};

exports.updateMovie = updateMovie = function (doubanId, onUpdated) {
    console.log('[movie]: ' + doubanId + ' begin!');

    var url = 'http://api.douban.com/v2/movie/subject/' + doubanId + '?apikey=' + settings.doubanAPIKey;
    httpHelp.get(url, function (data) {

        var movie = JSON.parse(data);

        new Mongoda().open(function (err, db) {
            if (err) {
                console.err(err);
                return;
            }

            var movies = db.collection('movies');

            movies.update({id: movie.id}, movie, {safe: true, upsert: true}, function (err) {
                readDoubanPage(doubanId, function (languages, duration, pubdate) {
                    db.close();
                    movies.update({ id: doubanId }, { $set: { languages: languages, duration: duration, pubdate: pubdate } }, { w: 1 }, onUpdated);
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

        var match = html.match(/<span property="v:runtime" content="\d+/g);

        if (match && match.length > 0) {
            duration = parseInt(match[0].match(/\d+/)[0]);
        }

        match = html.match(/<span class="pl">语言\:<\/span>.+</g);
        if (match && match.length > 0) {
            var temp = match[0].substring(match[0].lastIndexOf('>') + 1, match[0].length - 1);
            var tempAr = temp.split('/');
            for (var i = 0; i < tempAr.length; i++) {
                languages.push(tempAr[i].trim());
            }
        }

        match = html.match(/<span property="v:initialReleaseDate" content="\d{4}-\d{2}-\d{2}/g);

        if (match && match.length > 0) {
            var temp = match[0].match(/\d{4}-\d{2}-\d{2}/)[0];

            pubdate = parseInt(dateHelp.formatDate(new Date(temp), 'YYYYMMdd'));
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


