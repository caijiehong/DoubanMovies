define(['jquery', 'underscore', 'backbone', 'modules/home/home', 'modules/list/list', 'appView'],
    function ($, _, Backbone, ViewHome, list, AppView) {

        var Router = Backbone.Router.extend({
            /*
             routes设定了应用的路由，用户点击链接后指向不同的hash，
             则Backbone会根据routes的设定执行对应的方法
             */
            routes: {
                '': 'showHome',
                'home/:tag': 'showHome',
                'list/:tag/:id/:v/:c': 'showList'
            },

            loading: false,
            appView: null,

            initialize: function () {
                this.appView = new AppView();

                Backbone.history.start();

                var router = this;

            },

            showHome: function (tag) {
                this.appView.showHome({tag: tag});
            },

            showList: function (tag, id, v, c) {
                this.appView.showList({tag: tag, id: id, desc: decodeURI(v), count: c, userModel: this.userModel});
            },

            changePage: function (pagehash, page) {
                this.currentView = page;

//                page.render();

                $(pagehash).page().trigger('create');
                $.mobile.changePage(pagehash);
            }
        });

        return Router;
    });