function TRRender(i, item, num) {
    var html = '';
    html += '<tr>';
    for (var key in item) {
        html += '<td>' + item[key] + '</td>';
    }
    return html;
}

function GetParams() {
    return {};
}

function CloseDetail() {
    $('#div_bg').hide();
    $('#div_contain').hide();
}

var Table1 = null;
var Temp = null;

function read(user) {

    $.post('/home/user/' + user, function (json) {

        $('#divLoading').hide();

        $('#divUser').html(user);

        var avR = Math.round(json.averageRate * 1000) / 1000;

        var sum = '<a target="_blank" href="http://movie.douban.com/people/' + $('#douban_user_id').val() + '/">' + json.userName + '</a>'
            + ' 总共看了 '
            + json.totalWatch
            + ' 部电影，总时长 '
            + json.totalDuration
            + ' 分钟，平均打分 '
            + avR;

        $('#spnSum').html(sum);

        drawRate(json);
        drawCountry(json);
        drawYear(json);
        drawWatchTime(json);
        drawDirector(json);
        drawCast(json);
        drawGenre(json);
    })
}

function update() {
    $.post('/douban/update', { user: $('#txt').val() }, function (data) {

        $('#divMsg').html(data);
    })
}

$(document).ready(function () {
    $('#imgDouban').click(function () {
        var url = 'https://www.douban.com/service/auth2/auth?'
            + 'client_id=' + $('#hidDoubanKey').val()
            + '&redirect_uri=http://' + $('#hidDomain').val() + '/home/index'
            + '&response_type=code&scope=shuo_basic_r,shuo_basic_w,douban_basic_common';
        window.open(url, '_blank');
    });
    $('#btnUser').click(function () {
        var user = $.trim($('#txtUser').val());
        if (user) {
            window.location.href = '/home/user/' + user;
        } else {
            $('#msgErr').html('请输入一个豆瓣ID');
        }
        return false;
    });

    var user = $('#douban_user_id').val();
    $('#btnUpdate').click(function () {
        $.post('/home/update/' + user);
    });
    $('#txtUser').val(user);

});

google.load('visualization', '1.0', {'packages': ['corechart']});
google.setOnLoadCallback(function () {
    read(document.getElementById('douban_user_id').value);
});

function drawRate(json) {
    var rate = [
        ['5星', 0],
        ['4星', 0],
        ['3星', 0],
        ['2星', 0],
        ['1星', 0]
    ];
    for (var i = json.rate.length - 1; i > -1; i--) {
        var item = json.rate[i];
        if (item.rate > 0 && item.rate < 6) {
            rate[item.rate - 1][1] = item.count;
        }
    }

    // Create the data table.
    var data = new google.visualization.DataTable();
    data.addColumn('string', 'Topping');
    data.addColumn('number', 'Slices');
    data.addRows(rate);

    // Set chart options
    var options = {'title': '打分'};

    // Instantiate and draw our chart, passing in some options.
    var chart = new google.visualization.PieChart(document.getElementById('chart_rate'));
    chart.draw(data, options);
}


function drawCountry(json) {
    var ar = [
        ['国家地区', '数量']
    ]
    for (var i = 0; i < 8 && i < json.countries.length; i++) {
        ar.push([json.countries[i].country, json.countries[i].count]);
    }
    var data = google.visualization.arrayToDataTable(ar);

    var options = {
        title: '国家地区'
    };

    var chart = new google.visualization.ColumnChart(document.getElementById('chart_country'));
    chart.draw(data, options);
}

function drawYear(json) {
    var ar = [
        ['上映时间', '数量']
    ]
    var lastYear;
    var lastCount = 0;
    for (var i = 0; i < json.years.length; i++) {
        if (!json.years[i].year || json.years[i].year.length != 4) continue;
        var year = parseInt(json.years[i].year);
        year = year >= 2000 ? year
            : year >= 1995 ? '95\'s'
            : year >= 1990 ? '90\'s'
            : year >= 1980 ? '80\'s'
            : '其他';
        var count = json.years[i].count;

        if (lastYear && lastYear != year) {
            ar.push([lastYear.toString(), lastCount])

            lastCount = 0;
        }
        lastYear = year;
        lastCount += count;
    }
    if (lastYear) {
        ar.push([lastYear.toString(), lastCount])
    }
    var data = google.visualization.arrayToDataTable(ar);

    var options = {
        title: '上映时间'
    };

    var chart = new google.visualization.ColumnChart(document.getElementById('chart_year'));
    chart.draw(data, options);
}

function drawWatchTime(json) {
    var ar = [
        ['Month', '数量']
    ];
    for (var i = 0; i < json.watchTime.length; i++) {
        var item = json.watchTime[i];
        ar.push([item.month, item.count]);
    }
    var data = google.visualization.arrayToDataTable(ar);

    var options = {
        title: '观影时间'
    };

    var chart = new google.visualization.LineChart(document.getElementById('chart_watchTime'));
    chart.draw(data, options);
}

function drawDirector(json) {
    var ar = [
        ['导演', '数量']
    ]
    for (var i = 0;i<20&& i < json.directors.length; i++) {
        ar.push([json.directors[i].director, json.directors[i].count]);
    }
    var data = google.visualization.arrayToDataTable(ar);

    var options = {
        title: '导演'
    };

    var chart = new google.visualization.BarChart(document.getElementById('chart_director'));
    chart.draw(data, options);
}
function drawCast(json) {
    var ar = [
        ['演员', '数量']
    ]
    for (var i = 0;i<20&& i < json.casts.length; i++) {
        ar.push([json.casts[i].cast, json.casts[i].count]);
    }
    var data = google.visualization.arrayToDataTable(ar);

    var options = {
        title: '演员'
    };

    var chart = new google.visualization.BarChart(document.getElementById('chart_cast'));
    chart.draw(data, options);
}

function drawGenre(json) {
    var ar = [
        ['类型', '数量']
    ]
    for (var i = 0;i<10&& i < json.genres.length; i++) {
        ar.push([json.genres[i].genre, json.genres[i].count]);
    }
    var data = google.visualization.arrayToDataTable(ar);

    var options = {
        title: '类型'
    };

    var chart = new google.visualization.BarChart(document.getElementById('chart_genre'));
    chart.draw(data, options);
}