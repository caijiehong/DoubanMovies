var settings = require('../settings');
var Db = require('mongodb').Db;
var Connection = require('mongodb').Connection;
var Server = require('mongodb').Server;
var fs = require('fs');

var mongodb = new Db('doubanDB', new Server('localhost', Connection.DEFAULT_PORT, {}));

var jsonData =[];

fs.readFile('movies.json', function (err, data) {
    if (err) throw err;
    var str = data.toString('utf8').replace(/\n/g, ',');

    str = '[' + str.substr(0, str.length - 1) + ']';
    jsonData = JSON.parse(str)
    var i = jsonData.length - 1;
    while (i > -1) {
        delete jsonData[i]._id;
        i--;
    }

    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }

        insertDb(db)
    });
});

function insertDb(db){
    var i = 0;
    var ar =[];
    while(i< 300&& jsonData.length> 0){
        ar.push(jsonData.pop());
        i++;
    }
    if(i>0){
        db.collection('movies', function (err, collection) {

            collection.insert(ar, {safe: true}, function (err, post) {
                if(err){
                    console.log(err);
                }else{
                    console.log('done');
                }
                insertDb(db);
            });
        });
    }
}