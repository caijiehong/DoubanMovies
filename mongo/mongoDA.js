var MongoClient = require('mongodb').MongoClient;

exports.connectDB = function(req, onConnect){
    if(req.mongodb){
        onOpen(req.mongodb);
    }else{
        var url = 'mongodb://dbuser:a123456@mongo.onmodulus.net:27017/e7Qapaze'
        MongoClient.connect(url, function (err, db) {
            req.mongodb = db;
            onConnect(db);
        });
    }
}

exports.closeDB = function(req){
    if(req.mongodb){
        req.mongodb.close();
        req.mongodb = null;
    }
}


