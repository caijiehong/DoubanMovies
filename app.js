
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path');

var controllers = {};

var app = express();

app.configure(function () {
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.favicon());

    //app.use(express.logger('dev'));

    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser('your secret here'));
    app.use(express.session());

    app.use(express.static(path.join(__dirname, 'public')));

    app.use(app.router);

    //app.use(require('stylus').middleware(__dirname + '/public'));
});

app.configure('development', function () {
    app.use(express.errorHandler());
});


function urlRouter(req, res, isPost) {

    console.log('requestUrl', req.originalUrl);

    var controller = req.params.controller;
    var action = req.params.action;

    if (!controllers[controller]) {
        controllers[controller] = require('./routes/' + controller);
    }

    if (isPost) {
        controllers[controller].post(req, res, action);
    } else {
        controllers[controller].get(req, res, action);
    }
}

app.get('/', function (req, res) {
    res.redirect('/douban');
});

app.get('/:controller/:action?/:id?', function (req, res) {
    urlRouter(req, res, false);
});
app.post('/:controller/:action?/:id?', function (req, res) {
    urlRouter(req, res, true);
});

http.createServer(app).listen(app.get('port'), function () {
    console.log("Express server listening on port " + app.get('port'));
});
