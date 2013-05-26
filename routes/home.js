var settings = require('../settings')
    , https = require('https')
    , session = require('../models/session');

exports.index = new (function () {
    this.get = function (req, res) {
        var user = session.get(req).userInfo();
        var douban_user_id = settings.douban_user_id;
        var douban_user_name = settings.douban_user_name;
        if(user){
            douban_user_id = user.douban_user_id;
            douban_user_name = user.douban_user_name;
        }

        res.render('index',
            {
                doubanKey: settings.doubanAPIKey,
                domain: settings.domain,
                douban_user_id: douban_user_id,
                douban_user_name:douban_user_name
            }
        );
    }
    return this;
})();

exports.user = new (function(){
    this.get = function(req, res, douban_user_id){

        res.render('index',
            {
                doubanKey: settings.doubanAPIKey,
                domain: settings.domain,
                douban_user_id: douban_user_id,
                douban_user_name:douban_user_id
            }
        );
    }
})();


exports.douban = {
    get: function (req, res) {
        var code = req.param('code');
        var path = '/service/auth2/token?'
            + '&client_id=' + settings.doubanAPIKey
            + '&client_secret=' + settings.doubanSecret
            + '&redirect_uri=http://' + settings.domain + '/home/index'
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