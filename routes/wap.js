var testData = require('./testData')
var settings = require('../settings');
var dou_user = require('../douban/user.js');
var dou_movie = require('../douban/movie.js');

exports.index = {
    get: function (req, res, id) {
        if (!id) return res.redirect('/wap/index/staybird');

        if (settings.debug) {
            return res.render('wap', {topList: testData.topList});
        }

        dou_user.top(25).then(function (results) {
            res.render('wap', {topList: results});
        });
    }
};

exports.tagdata = {
    get: function (req, res, userId) {
        if (settings.debug) {
            return res.send(testData.movieList);
        }

        var type = req.query.type;
        var id = req.query.id;
        var index = req.query.index;

        dou_movie.tag(userId, type, id).then(function (movieList) {
            movieList = movieList.slice(index, index + 10);
            res.send(movieList);
        });

        return;
    }
}
