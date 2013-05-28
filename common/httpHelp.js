var http = require('http');

exports.get = function (url, callback) {
    var buf = '';
    http.get(url,function (res) {
        res.setEncoding('utf8');

        res.on('data',function (chunk) {
            buf += chunk;
        }).on('end', function () {
                callback(buf);
            });
    }).on('error', function (e) {
            console.log("Got error: " + e.message);
        });
};