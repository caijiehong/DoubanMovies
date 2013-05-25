var settings = require('../settings')
    , https = require('https')
    , session = require('../models/session');

exports.index = new (function () {
    this.get = function (req, res) {
        var user = session.get(req).userInfo();

        res.render('index',
            {
                doubanKey: settings.doubanAPIKey,
                domain: settings.domain,
                doubanUser: user?user.username:settings.doubanUser
            }
        );
    }
    return this;
})();


exports.douban = {
    get: function (req, res) {
        var code = req.param('code');
        var path = '/service/auth2/token?'
            + '&client_id=' + settings.doubanAPIKey
            + '&client_secret=' + settings.doubanSecret
            + '&redirect_uri=http://' + settings.domain + '/home/douban'
            + '&grant_type=authorization_code'
            + '&code=' + code;
        httpsPost('www.douban.com', path, null, function (err, data) {
            if (!err) {
                var json = JSON.parse(data);

                session.get(req).initUser(json.douban_user_name, json.douban_user_id);
            } else {
                console.log(err);
            }
            res.redirect('/');
        });
    }
}

function httpsPost(hostname, path, postdata, onReceive) {

    var options = {
        hostname: hostname,
        path: path,
        method: 'POST',
        headers: {
            'Content-Type': "application/x-www-form-urlencoded",
            'content-length': postdata ? Buffer.byteLength(postdata) : 0
        }
    };

    var req = https.request(options, function (res) {
        res.on('data', function (d) {
            onReceive(null, d.toString('utf8'));
        });
    });
    req.end();

    req.on('error', function (e) {
        onReceive(e, null);
    });
}