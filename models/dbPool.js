// Generated by CoffeeScript 1.6.3
(function() {
  var DbPool, Mongoda;

  Mongoda = require('./mongoda');

  DbPool = function(dbUrl, count) {
    var da, dbList, readIndex, total;
    count = +count || 1;
    dbList = [];
    readIndex = 0;
    total = 0;
    while (count--) {
      da = new Mongoda(dbUrl);
      da.open(function(err, db) {
        if (!err) {
          dbList.push(db);
          total++;
          return console.log('dbPool', total);
        }
      });
    }
    this.pop = function() {
      var temp;
      temp = dbList[readIndex];
      readIndex = (++readIndex) % total;
      return temp;
    };
    return this;
  };

  module.exports = DbPool;

}).call(this);
