var http = require('http'),
    events = require("events"),
    mongoDA = require('../mongo/mongoDA.js'),
    doubanDA = require('../mongo/doubanDA.js');

exports.get = function (req, res, action) {

    var param = req.params.id;
    switch (action) {
        case 'users': {

            doubanDA.collection('users', function (users) {
                users.find({ user: param }, { _id: 0 }).toArray(function (err, item) {
                    res.send(item);
                })
            });
            break;
        }
        case 'movies': {
            doubanDA.collection('movies', function (movies) {
                movies.findOne({ id: param }, { _id: 0 }, function (err, item) {

                    if (item) {
                        var cursor = movies.find();

                        cursor.count(function (err, count) {
                            item.totalMoives = count;

                            res.send(item);
                        });
                    } else {
                        res.send(err);
                    }
                })
            });
            break;
        }
        default:

    }
}

exports.post = function (req, res, action) {
    switch (action) {
        case 'import': {

            var json = req.body;

            doubanDA.collection('movies', function (movies) {

                for (var i = 0; i < json.length; i++) {
                    var item = json[i];

                    movies.update({ id: item.id }, item, { upsert: true }, function (err, ret) {
                    })
                }

                var cursor = movies.find();

                cursor.count(function (err, count) {
                    console.log("Total movies", count);

                    res.send("Total movies: " + count);
                });
            });

            break;
        }
        default:
    }
};