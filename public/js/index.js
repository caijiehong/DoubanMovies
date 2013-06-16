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
    })
}

function update() {
    $.post('/home/update/' + $('#txtUser').val(), function (data) {

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
}

function drawDirector(json) {
    if (!json.directors) return;

    json.directors.unshift(['演员', '数量'])
    var data = google.visualization.arrayToDataTable(json.directors);

    var options = {
        title: '导演'
    };

    var chart = new google.visualization.BarChart(document.getElementById('chart_director'));
    chart.draw(data, options);
}

function drawCast(json) {
    if (!json.casts) return;

    json.casts.unshift(['演员', '数量'])
    var data = google.visualization.arrayToDataTable(json.casts);

    var options = {
        title: '演员'
    };

    var chart = new google.visualization.BarChart(document.getElementById('chart_cast'));
    chart.draw(data, options);
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