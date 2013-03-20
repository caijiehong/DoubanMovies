var mongoDA = require('./mongoDA.js');

exports.collection = function (collectionName, onOpen) {

    mongoDA.open('localhost', 27017, 'doubanDB', function (db) {

        var data = db.collection(collectionName);

        onOpen(data);
    });

}