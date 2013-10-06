require.config({
    paths: {
        jquery: 'http://code.jquery.com/jquery-1.9.1.min',
        jqmconfig: '/js/wap/plugin/jqm.config',
        jqm: 'http://code.jquery.com/mobile/1.3.2/jquery.mobile-1.3.2.min',
        underscore: '/js/wap/vendor/underscore/underscore',
        backbone: '/js/wap/vendor/backbone/backbone',
        text: '/js/wap/vendor/require/text',
        plugin: '/js/wap/plugin',
        modules: '/js/wap/modules'
    },
    shim: {
        'jqm':{
            deps: ['jquery', 'jqmconfig'],
            exports: 'jqm'
        },
        'underscore': {
            exports: '_'
        },
        'backbone': {
            deps: ['underscore', 'jquery'],
            exports: 'Backbone'
        }
    }
});

require(['jqm', 'router'], function (jqm, Router) {
    var router = new Router();
});