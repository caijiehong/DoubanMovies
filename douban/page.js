var Q = require('../lib/q.js'),
    httpHelp = require('../common/httpHelp.js'),
    dou_user = require('./user.js');

exports.readPage = function (url) {
    httpHelp.get(url).then(function (html) {
        var reg = /movie\.douban\.com\/people\/([\w]+)\//g, ar = [], obj = {};
        for (var r; r = reg.exec(html);) {
            var uid = r[1];
            if (!obj[uid]) {
                ar.push(uid);
                obj[uid] = 1;
            }
        }

        function loop() {
            var item = ar.pop();
            if (item) {
                Q([Q.delay(1000), dou_user.refresh(item)]).spread(loop);
            }
        }

        loop();
    });
}