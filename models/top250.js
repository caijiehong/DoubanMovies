var Q = require('../lib/q.js')
    , httpHelp = require('../common/httpHelp.js')
    , dataDou = require('../data/douban.js');

var readIMDB = function () {
    var def = Q.defer();
    var url = 'http://www.imdb.com/chart/top';
    httpHelp.get(url).done(function (html) {
        var reg = /href="\/title\/(tt\d+)\/"/g, r, top250 = [];
        while (r = reg.exec(html)) {
            top250.push({imdbId: r[1]});
        }

        var dou250 = {};
        dataDou.top250.forEach(function (item) {
            dou250[item.imdbId] = {id: item.id, title: item.title};
        });

        top250.forEach(function (item) {
            if (dou250[item.imdbId]) {
                item.id = dou250[item.imdbId].id;
                item.title = dou250[item.imdbId].title;
            }
        });

        def.resolve(top250);
    });
    return def.promise;
};

var readDouban = function () {
    var top250 = new Array(250);

    var request = function (start) {
        var def = Q.defer();

        httpHelp.get('http://api.douban.com/v2/movie/top250?count=100&start=' + start).done(function (data) {
            var json = JSON.parse(data);
            var subjects = json.subjects;
            subjects.forEach(function (item, i) {
                top250[start + i] = {id: +item.id, title: item.title};
            });

            def.resolve();
        });

        return def.promise;
    };

    Q.all([request(0), request(100), request(200)]).then(function () {


    })
};

var readDouId = function (imdbId) {
    var def = Q.defer();
    setTimeout(function(){
        httpHelp.get('http://api.douban.com/v2/movie/search?q=' + imdbId).done(function (data) {
            var json = JSON.parse(data), re;
            if (json.subjects.length) {
                re = json.subjects[0];
            }
            def.resolve(re);
        });
    }, 500);
    return def.promise;
}

var readIMDBId = function (douId) {
    var def = Q.defer();
    httpHelp.get('http://movie.douban.com/subject/' + douId + '/').done(function (data) {
        var reg = /www\.imdb\.com\/title\/(tt\d+)/
            , r = reg.exec(data)
            , imdbId;
        if (r) {
            imdbId = r[1];
        }
        def.resolve(imdbId);
    });
    return def.promise;
};

var readAll = function () {
    var ar = dataDou.top250
        , newAr = []
        , def = Q.defer();

    var loop = function () {
        var item = ar.pop();
        if (item) {
            readIMDBId(item.id).done(function (imdbId) {
                item.imdbId = imdbId;
                console.log(item);
                newAr.push(item);
                setTimeout(loop, 500);
            });
        } else {
            def.resolve(newAr);
            return;
        }
    }

    loop();
    return def.promise;
}


exports.readDouId = readDouId;

exports.run = readIMDB;