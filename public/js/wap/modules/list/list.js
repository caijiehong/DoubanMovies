// Filename: store/vew/list.js
define(['jquery', 'underscore', 'backbone', 'text!modules/list/listView.html', 'testData'],
    function ($, _, Backbone, listViewTemplate, testData) {

        var Movie = Backbone.Model.extend();

        var Movies = Backbone.Collection.extend({model: Movie});

        var movieView = Backbone.View.extend({
            tagName: 'li',
            template: _.template(listViewTemplate),
            render: function() {
                this.$el.html(this.template(this.model.toJSON()));
                return this;
            }
        });

        var PageView = Backbone.View.extend({
            el: $('#list'),

            initialize: function () {
                this.movies = new Movies();

                this.listenTo(this.movies, 'reset', this.render);

                this.movies.fetch({url: '/home/tagdata/staybird?type=1&id=2', reset: true});
            },

            index: 0,

            backHome: function (event) {
                event.preventDefault();
                $.mobile.changePage('#home/' + this.tag);
            },

            render: function () {

                var state = this.movies.toJSON();

                var html = ['<li data-icon="delete">' + state.tagDesc + '</li>'];

                var tagList = this.options.userModel.get(state.tag);

                for (var i = 0; i < tagList.length; i++) {
                    var item = tagList[i];
                    html.push('<li><a href="#list/' + state.tag + '/' + item[2] + '/' + item[0] + '/">' + item[0] + '</a></li>' + tagList[0])
                }

                $('#ulList').html(html.join());

                $('#h1List').html(state.desc);


                $('#headerList a').attr('href', '#home/' + state.tag)

                $('#contentList').html(this.template(state));

                return this;
            }
        });
        return PageView;
    });