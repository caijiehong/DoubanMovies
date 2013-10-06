// Filename: store/vew/home.js
define(['jquery', 'underscore', 'backbone', 'text!modules/home/homeView.html', 'testData'],
    function ($, _, Backbone, homeViewTemplate, testData) {

        var mainHomeView = Backbone.View.extend({
            template: _.template(homeViewTemplate),

            el: $("#contentHome"),

            initialize: function () {
                this.$el = $('#contentHome');
            },

            render: function () {

                var userJson = this.model.toJSON();

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

                userJson.tag = this.options.tag || 'rate';

                $('#h1Home').html('<a href="/wap/index/' + userJson.userId + '">' + userJson.userName + '</a>')

                userJson.list = userJson[userJson.tag];

                userJson.tagName = userJson.tag == 'directors' ? '导演' :
                    userJson.tag == 'casts' ? '演员' :
                        userJson.tag == 'years' ? '上映时间' :
                            userJson.tag == 'watchTime' ? '观影时间' :
                                userJson.tag == 'countries' ? '国家' :
                                    userJson.tag == 'genres' ? '类型' : '';

                this.$el.html(this.template(userJson));


                return this;
            }
        });


        return mainHomeView;
    })
;