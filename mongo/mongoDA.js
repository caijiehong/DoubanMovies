var MongoClient = require('mongodb').MongoClient,
events = require("events");

var dbs = {};


exports.open = function (ip, port, dbName, onConnect) {
    if (!dbs[dbName]) {
        //var url = 'mongodb://' + ip + ':' + port + '/doubanDB';
        var url = 'mongodb://dbuser:a123456@mongo.onmodulus.net:27017/e7Qapaze'
        MongoClient.connect(url, function (err, db) {
            if (!err) {
                dbs[dbName] = db;
            }

            onConnect(db);
        });
    } else {
        onConnect(dbs[dbName]);
    }
}


