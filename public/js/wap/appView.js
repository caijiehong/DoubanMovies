define(['jquery', 'backbone', 'text!modules/list/listView.html', 'text!modules/home/homeView.html'],
    function ($, Backbone, itemViewTemplate, homeViewTemplate) {
        var UserModel = Backbone.Model.extend({
            initialize: function () {
                this.url = '/home/userdata/' + this.get('userId');
            }
        });

        var Movie = Backbone.Model.extend();

        var Movies = Backbone.Collection.extend({model: Movie});

        var MovieView = Backbone.View.extend({
            tagName: "li",

            template: _.template(itemViewTemplate),

            render: function () {
                var json = this.model.toJSON();
                this.$el.html(this.template(json));
                return this;
            }
        });

        var App = Backbone.View.extend({
            el: $("doby"),
            userModel: null,
            movieModel: null,
            loading: null,
            loadIndex: 0,
            packetLength: 10,
            userId: window.location.pathname.split('/').pop(),
            initialize: function () {
                var view = this;
                $('#btnLoadMore').click(function () {
                    if (!view.loading) {
                        view.loading = true;
                        $.mobile.loading("show", {
                            text: 'Loading',
                            textVisible: true
                        });

                        view.loadMore(function () {
                            view.loading = false;
                            $.mobile.loading("hide");
                        });
                    }
                });
//                $(window).on('scrollstop', function () {
//
//                    if (view.loading || !view.loadMore) return false;
//
//                    var temp = $(document).scrollTop() + $(window).height() - $(document).height();
//
//                    if (temp >= 0) {
//
//                        view.loading = true;
//                        $.mobile.loading('show');
//
//                        setTimeout(function () {
//                            $.mobile.loading('hide');
//                            view.loading = false;
//                        }, 1500);
//
//                        view.loadMore();
//                    }
//                });
            },

            render: function () {

            },

            showHome: function (state) {

                $.mobile.changePage('#home');

                this.loadMore = null;

                if (!this.userModel) {
                    var view = this;
                    var userModel = new UserModel({userId: this.userId});
                    userModel.fetch({success: function (model) {
                        view.userModel = model;
                        view.renderHome(state);
                    }});
                } else {
                    this.renderHome(state);
                }
            },

            renderHome: function (state) {
                var userJson = this.userModel.toJSON();

                var avR = 0;

                userJson.avR = avR = Math.round(userJson.averageRate * 1000) / 1000;
                userJson.star = avR <= 0 ? 'star00'
                    : avR <= 0.5 ? 'star05'
                    : avR <= 1.0 ? 'star10'
                    : avR <= 1.5 ? 'star15'
                    : avR <= 2.0 ? 'star20'
                    : avR <= 2.5 ? 'star25'
                    : avR <= 3.0 ? 'star30'
                    : avR <= 3.5 ? 'star35'
                    : avR <= 4.0 ? 'star40'
                    : avR <= 4.5 ? 'star45'
                    : 'star50';

                userJson.tag = state.tag || 'rate';

                $('#h1Home').html('<a href="/wap/index/' + userJson.userId + '">' + userJson.userName + '</a>')

                userJson.list = userJson[state.tag];

                userJson.tagName = userJson.tag == 'directors' ? '导演' :
                    userJson.tag == 'casts' ? '演员' :
                        userJson.tag == 'years' ? '上映时间' :
                            userJson.tag == 'watchTime' ? '观影时间' :
                                userJson.tag == 'countries' ? '国家' :
                                    userJson.tag == 'genres' ? '类型' : '';

                $('#contentHome').html(_.template(homeViewTemplate)(userJson));

                $('#home').page().trigger('create');
                return this;

            },

            showList: function (state) {
                var view = this;

                view.loadIndex = 0;

                $.mobile.changePage('#list');

                this.loadMore = function (callback) {

                    view.movieModel.fetch({
                        url: '/wap/tagdata/' + view.userId + '?type=' + state.tag + '&id=' + state.id + '&index=' + view.loadIndex,
                        reset: true,
                        success: function (models, respond) {

                            view.renderMovies(models);
                            if (callback) callback();
                        }});
                }


                if (!this.userModel) {
                    var userModel = new UserModel({userId: window.location.pathname.split('/').pop()});
                    userModel.fetch({success: function (model) {
                        view.userModel = model;

                        view.movieModel = new Movies();
                        view.movieModel.fetch({
                            url: '/wap/tagdata/' + view.userId + '?type=' + state.tag + '&id=' + state.id + '&index=' + view.loadIndex,
                            reset: true,
                            success: function () {
                                view.renderList(state);
                            }});
                    }});
                } else {
                    this.movieModel = new Movies();
                    this.movieModel.fetch({
                        url: '/wap/tagdata/' + view.userId + '?type=' + state.tag + '&id=' + state.id + '&index=' + view.loadIndex,
                        reset: true,
                        success: function () {
                            view.renderList(state);
                        }});
                }

                return this;
            },

            renderList: function (state) {

                this.renderMovies(this.movieModel, true);

                var html = ['<li data-icon="delete">' + state.desc + '</li>'];

                var tagList = this.userModel.get(state.tag);

                for (var i = 0; i < tagList.length; i++) {
                    var item = tagList[i];
                    var id = item[2] || item[0];
                    html.push('<li><a href="#list/' + state.tag + '/' + id + '/' + item[0] + '/' + item[1] + ' ">' + item[0]);
                    html.push('<span class="ui-li-count">' + item[1] + '</span></a></li>');
                }

                $('#ulList').html(html.join('')).listview('refresh');

                $('#h1List').html(state.desc);


                $('#headerList a:eq(0)').attr('href', '#home/' + state.tag);

                $('#list').page().trigger('create');

                return this;
            },

            renderMovies: function (movies, clear) {
                if (clear) {
                    $('#ulMovieList').empty();
                    this.loadIndex = 0;
                }
                if (movies.length < this.packetLength) {
                    $('#btnLoadMore').button('disable');
                }
                this.loadIndex += movies.length;
                movies.each(function (model) {
                    var view = new MovieView({model: model});
                    $('#ulMovieList').append(view.render().el);
                });

                $('#ulMovieList').listview("refresh");
            }
        });

        return App;
    });