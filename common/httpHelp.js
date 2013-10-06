var baiduBucket, fs, http, path, uri;

http = require('http');

fs = require('fs');

uri = require('url');

path = require('path');

baiduBucket = require('./baiduBucket');

var Q = require('../lib/q.js');

exports.get = function (url) {

    var def = Q.defer();

    http.get(url,function (res) {

        var buf = new Buffer([]);
        res.on('data', function (chunk) {
            buf = Buffer.concat([buf, chunk]);
        });

        res.on('end', function () {
            def.resolve(buf.toString());
        });

        res.on('error', function (err) {
            def.reject(err);
        });

        return;
    }).on('error', function (err) {
            def.reject(err);
        });

    return def.promise;
};