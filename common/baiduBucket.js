var baiduUrl, crypto, doubanImageTimer, hostname, http, httpPath, settings, urlHelp;

settings = require('../settings');

crypto = require('crypto');

http = require('http');

urlHelp = require('url');

var Q = require('../lib/q.js');

doubanImageTimer = null;

exports.hostname = hostname = 'bcs.duapp.com';

exports.saveDouanImage = function (url, doubanId) {
    var def = Q.defer();
    http.get(url, function (res) {
        var buf;
        if (!(res.headers['content-length'] > 0)) {
            def.reject();
            return;
        }
        buf = new Buffer([]);
        res.on('data', function (chunk) {
            return buf = Buffer.concat([buf, chunk]);
        });
        res.on('end', function () {
            var baiduBuf, filePath, options, req, temp;
            if (buf.length === 0) {
                def.reject();
                return;
            }
            temp = doubanId % 100 >= 10 ? (doubanId % 100).toString() : "0" + (doubanId % 100);
            filePath = "/" + temp + "/" + doubanId + ".jpg";
            options = {
                hostname: hostname,
                path: httpPath('PUT', filePath),
                method: 'PUT',
                headers: {
                    'Content-length': buf.length,
                    'Content-Type': 'image/jpeg'
                }
            };
            baiduBuf = new Buffer([]);
            req = http.request(options, function (res) {
                res.on('data', function (chunk) {
                    return baiduBuf = Buffer.concat([baiduBuf, chunk]);
                });
                res.on('end', function () {
                    var err, json, str;
                    str = baiduBuf.toString('utf8');
                    if (str) {
                        console.log('baidu respond', str);
                    }
                    if (str && (json = JSON.parse(str)) && json.Error) {
                        def.reject(json.Error);
                        return;
                    } else {
                        def.resolve(httpPath('GET', filePath));
                        return;
                    }
                });
                res.on('error', function (err) {
                    def.reject(err);
                });
                return;
            });
            req.on('error', function (err) {
                def.reject(err);
            });
            req.write(buf);
            return req.end();
        });
        return res.on('error', function (err) {
            def.reject(err);
        });
    });
    return def.promise;
};

exports.httpPath = httpPath = function (method, filePath) {
    var content, signture;
    content = "MBO\nMethod=" + method + "\nBucket=" + settings.baiduBucket + "\nObject=" + filePath + "\n";
    signture = crypto.createHmac('sha1', new Buffer(settings.baiduSecretKey)).update(content).digest('base64');
    return "/" + settings.baiduBucket + "/" + (filePath.replace(/\//g, '%2F')) + "?sign=MBO:" + settings.baiduAccessKey + ":" + (encodeURIComponent(signture));
};

baiduUrl = function (method, filePath) {
    var content, signture;
    content = "MBO\nMethod=" + method + "\nBucket=" + settings.baiduBucket + "\nObject=" + filePath + "\n";
    signture = crypto.createHmac('sha1', new Buffer(settings.baiduSecretKey)).update(content).digest('base64');
    return urlHelp.format({
        protocol: 'http',
        hostname: hostname,
        pathname: "/" + settings.baiduBucket + "/" + (filePath.replace(/\//g, '%2F')),
        query: {
            sign: "MBO:" + settings.baiduAccessKey + ":" + signture
        }
    });
};