var express = require('express')
    , path = require('path')
    , settings = require('./settings.js')
    , Q = require('./lib/q.js');
var controllers = {};

var app = express();

app.configure(function () {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.favicon());
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser());

    app.use(express.session({

        secret: settings.cookie_secret
    }));

    app.use(express.static(path.join(__dirname, 'public')));
//    app.use(express.logger('dev'));
    app.use(app.router);
});

app.configure('development', function () {
    app.use(express.errorHandler());
    app.locals.pretty = true;
});


function urlRouter(req, res, controller, action, id, ispost) {

    if (controller === 'js' || controller === 'css' || controller === 'html' || controller === 'img') {
        res.status(404);
        res.send();
        return;
    }

    controller = controller || 'home';
    action = action || 'index';

    var ctr = controllers[controller];

    try {
        if (!ctr) {
            ctr = controllers[controller] = require('./routes/' + controller);
        }

        res.locals.douban_user_id = res.locals.douban_user_id || settings.douban_user_id;
        res.locals.douban_user_name = res.locals.douban_user_name || settings.douban_user_name;

        if (ctr[action]) {
            if (ispost && ctr[action].post) {
                ctr[action].post(req, res, id);
            } else if (!ispost && ctr[action].get) {
                ctr[action].get(req, res, id);
            } else {
                res.status(404);
                res.render('error', {error: 'method not found'});
            }
        } else {
            res.status(404);
            res.render('error', {error: 'page not found'});
        }
    } catch (err) {
        console.error('404 @ ', req.url);
        console.error(err.stack);
        res.status(404);
        res.render('error', {error: err.stack});
    }
}

app.get('/', function (req, res) {
    urlRouter(req, res, 'home', 'index');
});

app.get('/:controller/:action?/:id?', function (req, res) {
    urlRouter(req, res, req.params.controller, req.params.action, req.params.id, false);
});

app.post('/:controller/:action?/:id?', function (req, res) {
    urlRouter(req, res, req.params.controller, req.params.action, req.params.id, true);
});


exports.start = start = function () {

    console.log('server start');

    var server = require('http').createServer(app);

    var port = settings.serverPort;
    server.listen(port);

    process.on('uncaughtException', function (err) {
        console.error('app error', err.stack);
    });
};

if (!module.parent) {
    start()
}

