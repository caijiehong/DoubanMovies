// Generated by CoffeeScript 1.6.3
(function() {
  var MongoClient, Mongoda, settings;

  MongoClient = (require('mongodb')).MongoClient;

  settings = require('../settings');

  Mongoda = function(dbUrl) {
    var _db, _dbUrl, _t;
    _t = this;
    _db = null;
    _dbUrl = dbUrl;
    this.open = function(onOpen) {
      return MongoClient.connect(_dbUrl, function(err, db) {
        if (err) {
          console.error('DBError', err);
        }
        _db = db;
        onOpen(err, db);
        return this;
      });
    };
    this.close = function() {
      if (_db) {
        _db.close;
      }
      return this;
    };
    this.collection = function(collectionName) {
      if (_db) {
        return _db.collection(collectionName);
      }
    };
    return this;
  };

  module.exports = Mongoda;

}).call(this);
