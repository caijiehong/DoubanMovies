var mysql = require('mysql')
    , settings = require('../settings.js')
    , Q = require('../lib/q.js');

var db_host = settings.mysqlHost;
var db_port = settings.mysqlPort;
var db_name = settings.mysqlSchema;

var option = {
    host: db_host,
    port: db_port,
    database: db_name,
    user: settings.mysqlUser,
    password: settings.mysqlPassword
}

var command = function (client, sql, params) {
    var def = Q.defer();
    client.query(sql, params, function (err, result) {
        if (err) {
            console.error('command', [sql, params, err]);
            def.reject(err);
        } else {
            def.resolve(result);
        }
    });

    return def.promise;
}

exports.query = query = function (sqlCommand, params) {
    var def = Q.defer(), client = mysql.createConnection(option);

    client.connect(function (err) {
        if (err) {
            console.error('mysql connect err', err);
            def.reject(err);
            return;
        }
        command(client, sqlCommand, params).then(function (result) {
            def.resolve(result);
        },function (err) {
            def.reject(err);
        }).finally(function () {
                client.end();
            });
    });

    return def.promise;
};

exports.connect = function (callback) {
    var that = {}, commands = [], client = mysql.createConnection(option);

    client.connect(function (err) {
        callback(err, that);
    });

    that.append = function (sql, params) {
        return commands.push({sql: sql, params: params});
    };

    that.runSql = function (keepAlive) {
        var def = Q.defer(), queues = [];

        for (var item; item = commands.shift();) {
            queues.push(command(client, item.sql, item.params));
        }

        return Q(queues).finally(function () {
            if (!keepAlive) client.end();
        });
    };
}