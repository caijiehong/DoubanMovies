var settings = require('../settings'),
    testData = require('./testData.js'),
    dou_user = require('../douban/user.js'),
    dou_movie = require('../douban/movie.js'),
    dou_page = require('../douban/page.js'),
    mysql = require('../common/mysql.js');

exports.index = {
    get: function (req, res, id) {
        var ua;
        ua = req.get('User-Agent');
        if (ua.indexOf('Mobile') > -1 || ua.indexOf('android') > -1) {
            return res.redirect('/wap/index/' + (id || 'staybird'));
        }
        if (settings.debug) {
            res.render('index', {
                doubanKey: settings.doubanAPIKey,
                topList: testData.topList
            });
            return;
        }

        dou_user.top(25).then(function (results) {
            res.render('index', {
                doubanKey: settings.doubanAPIKey,
                topList: results
            });
        });
    }
};

exports.user = {
    get: function (req, res, douban_user_id) {
        var ua;
        ua = req.get('User-Agent');
        if (ua.indexOf('Mobile') > -1 || ua.indexOf('android') > -1) {
            return res.redirect('/wap/index/' + (douban_user_id || 'staybird'));
        }
        if (settings.debug) {
            return res.render('index', {
                doubanKey: settings.doubanAPIKey,
                domain: settings.domain,
                douban_user_id: douban_user_id,
                douban_user_name: douban_user_id,
                topList: testData.topList
            });
        }

        dou_user.top(25).then(function (results) {
            res.render('index', {
                doubanKey: settings.doubanAPIKey,
                domain: settings.domain,
                douban_user_id: douban_user_id,
                douban_user_name: douban_user_id,
                topList: results
            });
        });
    },
    post: function (req, res, douban_user_id) {
        if (settings.debug) {
            return res.send(testData.userJson);
        }

        var start;
        start = new Date;
        dou_user.data(douban_user_id).then(function (userData) {
            var end;
            end = new Date;
            console.log('request ' + douban_user_id + ' cost: ', end - start);
            res.send(userData);
        }, function (err) {
            res.send(err);
        });
    }
};

exports.userdata = {
    get: function (req, res, douban_user_id) {
        if (settings.debug) {
            return res.send(testData.userJson);
        }

        var start;
        start = new Date;
        dou_user.data(douban_user_id).then(function (userData) {
            var end;
            end = new Date;
            console.log('request ' + douban_user_id + ' cost: ', end - start);
            res.send(userData);
        }, function (err) {
            res.send(err);
        });
    }
};

exports.update = {
    post: function (req, res, douban_user_id) {
        dou_user.refresh(douban_user_id);
        return res.send('success');
    },
    get: function (req, res, douban_user_id) {

        try {
            dou_user.refresh(douban_user_id).then(function (result) {
                res.send({result: result});
            }, function (err) {
                res.send({'cu co': err});
            });
        } catch (err1) {
            res.send({err1: err1});
        }
    }
};

exports.frontpage = {
    get: function (req, res) {
        dou_page.readPage('http://movie.douban.com');
        return res.send('success');
    }
};

exports.readpage = {
    get: function (req, res, url) {
        dou_page.readPage(req.query.url);
        return res.send('success!');
    }
};

exports.tagdata = {
    get: function (req, res, userId) {
        if (settings.debug) {
            return res.send({movies: testData.movieList});
        }

        dou_movie.tag(userId, req.query.type, req.query.id).then(function (results) {
            results = results.sort(function () {
                return Math.random() - 0.5;
            }).slice(0, 6);

            res.send({movies: results});
        });
    }
};