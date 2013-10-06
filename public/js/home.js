require.config({
    baseUrl: '/lib',
    paths: {
        jquery: 'jquery-2.0.3.min',
        async: 'async',
        goog: 'goog',
        propertyParser: 'propertyParser',
        layer: 'layer.min',
        artTemplate: 'art.template'
    }
});

define('tpl', ['jquery', 'artTemplate', 'text!../template/tag.html'], function ($, template, tpls) {
    var tplCache = {};
    $(tpls).filter('script').each(function (i, item) {
        tplCache[item.id] = template(item.id, item.innerHTML);
    });

    template.helper('console', console);

    var that = {};

    that.renderPop = function (jsonTags, jsonMovies) {
        return tplCache['tplTag']({tags: jsonTags, movies: jsonMovies});
    };

    that.renderMovies = function (jsonMovies) {
        return  tplCache['tplMovie']({movies: jsonMovies});
    };

    return that;
});

define('page', ['jquery', 'tpl', 'layer'], function ($, tpl, layer) {

    var getTagData = function (userId, type, id) {
        return $.getJSON("/home/tagdata/" + userId + "?type=" + type + "&id=" + id);
    }, switchTag = function (userId, type, id) {
        getTagData(userId, type, id).done(function (json) {
            var html = tpl.renderMovies(json.movies);
            $('#divMovies').html(html);
        });
    };

    var that = {};

    that.pop = function (userId, type, id, tagArr) {

        getTagData(userId, type, id).done(function (json) {

            $(tagArr).each(function (i, item) {
                if (item.id == id) {
                    item.selected = 1;
                }
            })

            var html = tpl.renderPop(tagArr, json.movies);
            $.layer({
                type: 1,
                shadeClose: false,
                page: {
                    html: html
                },
                title: false,
                offset: ['50px', '50%'],
                area: ['590px', '550px'],
                success: function (div) { //层加载成功后进行的回调
                    $(div).on('click', 'a.a_switch_tab_movie', function (e) {
                        e.preventDefault();
                        $(div).find('a.current').removeClass('current');
                        $(this).addClass('current');
                        switchTag(userId, type, $(this).data('id'));
                    });
                }
            });
        });
    }

    return that;
});


require(['jquery', 'goog!visualization,1,packages:[corechart]'], function ($) {

    var user = $('#douban_user_id').val();

    $('#formNav').submit(function(){
        var userId = $.trim($('#inp-query').val());
        if (userId) {
            window.location.href = '/home/user/' + user;
        }
        return false;
    });

    $('#btnUpdate').click(function(){
        $.post('/home/update/'+ user);
        $(this).hide();
    });

    $('#btnUpdate').click(function () {
        $.post('/home/update/' + user);
    });
    $('#txtUser').val(user);

    function drawRate(json) {
        if (!json.rate) return;

        // Create the data table.
        var data = new google.visualization.DataTable();
        data.addColumn('string', 'Topping');
        data.addColumn('number', 'Slices');
        data.addRows(json.rate);

        // Set chart options
        var options = {'title': '打分'};

        // Instantiate and draw our chart, passing in some options.
        var chart = new google.visualization.PieChart(document.getElementById('chart_rate'));
        chart.draw(data, options);

        google.visualization.events.addListener(chart, 'select', selectHandler);

        function selectHandler(e) {
            console.log(data.getValue(chart.getSelection()[0].row, 0));
        }
    }

    function drawCountry(json) {
        if (!json.countries) return;

        json.countries.unshift(['国家地区', '数量']);

        var data = google.visualization.arrayToDataTable(json.countries);

        var options = {
            title: '国家地区'
        };

        var chart = new google.visualization.ColumnChart(document.getElementById('chart_country'));
        chart.draw(data, options);
    }

    function drawYear(json) {
        if (!json.years) return;

        json.years.unshift(['上映时间', '数量']);

        var data = google.visualization.arrayToDataTable(json.years);

        var options = {
            title: '上映时间'
        };

        var chart = new google.visualization.ColumnChart(document.getElementById('chart_year'));
        chart.draw(data, options);

        google.visualization.events.addListener(chart, 'select', function () {
            var selection = chart.getSelection();
            if (selection && selection.length) {
                var dataArray = json.years;
                var item = dataArray[chart.getSelection()[0].row];
                var ar = [];
                $(dataArray).each(function (i, item) {
                    ar.push({id: item[0].toString(), name: item[0], count: item[1]});
                });
                popTagPage('years', item[0].toString(), ar);
            }
        });

    }

    function drawGenre(json) {
        if (!json.genres) return;

        json.genres.unshift(['类型', '数量']);

        var data = google.visualization.arrayToDataTable(json.genres);

        var options = {
            title: '类型'
        };

        var chart = new google.visualization.BarChart(document.getElementById('chart_genre'));
        chart.draw(data, options);
    }

    function drawDirector(json) {
        var dataArray = json.directors;
        if (!dataArray) return;

        var data = [];
        $(dataArray).each(function (i, item) {
            data.push([item[0], item[1]]);
        });
        data.unshift(['导演', '数量']);

        data = google.visualization.arrayToDataTable(data);
        var chart = new google.visualization.BarChart(document.getElementById('chart_director'));

        chart.draw(data, {title: '导演'});

        google.visualization.events.addListener(chart, 'select', function () {
            var selection = chart.getSelection();
            if (selection && selection.length) {
                var item = dataArray[chart.getSelection()[0].row];
                var ar = [];
                $(dataArray).each(function (i, item) {
                    ar.push({id: item[2], name: item[0], count: item[1]});
                });
                popTagPage('directors', item[2], ar);
            }
        });
    }

    function drawCast(json) {
        var dataArray = json.casts;
        if (!dataArray) return;

        var data = [];
        $(dataArray).each(function (i, item) {
            data.push([item[0], item[1]]);
        });
        data.unshift(['演员', '数量']);

        data = google.visualization.arrayToDataTable(data);
        var chart = new google.visualization.BarChart(document.getElementById('chart_cast'));

        chart.draw(data, {title: '演员'});

        google.visualization.events.addListener(chart, 'select', function () {
            var selection = chart.getSelection();
            if (selection && selection.length) {
                var item = dataArray[chart.getSelection()[0].row];
                var ar = [];
                $(dataArray).each(function (i, item) {
                    ar.push({id: item[2], name: item[0], count: item[1]});
                });
                popTagPage('casts', item[2], ar);
            }
        });
    }

    function drawWatchTime(json) {
        if (!json.watchTime) return;

        var ar = [
            ['Month', '数量']
        ];
        var avg = json.totalWatch / json.watchTime.length;
        for (var i = 0; i < json.watchTime.length; i++) {
            var month = json.watchTime[i][0];
            var count = json.watchTime[i][1];
            if (count < avg * 5 && month) {
                ar.push([month.toString(), count]);
            }
        }
        var data = google.visualization.arrayToDataTable(ar);

        var options = {
            title: '观影时间'
        };

        var chart = new google.visualization.LineChart(document.getElementById('chart_watchTime'));
        chart.draw(data, options);

        google.visualization.events.addListener(chart, 'select', function () {
            var selection = chart.getSelection();
            if (selection && selection.length) {
                var dataArray = json.watchTime;
                var item = dataArray[chart.getSelection()[0].row];
                var ar = [];
                $(dataArray).each(function (i, item) {
                    ar.push({id: item[0], name: item[0], count: item[1]});
                });
                popTagPage('watchTime', item[0].toString(), ar);
            }
        });
    }

    function popTagPage(type, id, tagArr) {
        require(['page'], function (page) {
            page.pop(user, type, id, tagArr);
        });
    }

    $.get('/home/userdata/' + user).done(function (json) {

        $('#divLoading').hide();

        $('#divUser').html(user);

        var avR = Math.round(json.averageRate * 1000) / 1000;
        var star = avR <= 0 ? 'star00'
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


        var sum = '<a target="_blank" href="http://movie.douban.com/people/' + $('#douban_user_id').val() + '/">' + json.userName + '</a>'
            + ' 总共看了 '
            + json.totalWatch
            + ' 部电影，总时长 '
            + json.totalDuration
            + ' 分钟，平均打分 '
            + '<span class="star ' + star + '"></span> ' + avR * 2;

        $('#spnSum').html(sum);

        drawRate(json);
        drawCountry(json);
        drawYear(json);
        drawWatchTime(json);
        drawDirector(json);
        drawCast(json);
        drawGenre(json);

    });
});