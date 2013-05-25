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
    $.post('/douban/data', {user: user}, function (json) {

        $('#divUser').html(user);

        var avR = Math.round(json.averageRate * 1000) / 1000;

        var sum = user + ' 总共看了 ' + json.totalWatch + '部电影，总时长 ' + json.totalDuration + ' 分钟，平均打分 ' + avR;
        $('#spnSum').html(sum);

        $('#tbDirector,#tbCast,#tbYear,#tbRate,#tbCountry,#tbGenres,#tbWatchTime').empty();

        if (json.totalWatch > 0) {

            var html = [];
            for (var i = 0; i < json.directors.length; i++) {
                var item = json.directors[i];
                html.push('<tr><td>' + item.director + '</td><td style="text-align:right">' + item.count + '</td></tr>');
            }
            $('#tbDirector').html(html.join(''));

            html = [];
            for (var i = 0; i < json.casts.length; i++) {
                var item = json.casts[i];
                html.push('<tr><td>' + item.cast + '</td><td style="text-align:right">' + item.count + '</td></tr>');
            }
            $('#tbCast').html(html.join(''));

            html = [];
            for (var i = 0; i < json.years.length; i++) {
                var item = json.years[i];
                html.push('<tr><td style="text-align:center">' + item.year + '</td><td style="text-align:right">' + item.count + '</td></tr>');
            }
            $('#tbYear').html(html.join(''));

            html = [];
            for (var i = 0; i < json.rate.length; i++) {
                var item = json.rate[i];
                html.push('<tr><td style="text-align:center">' + item.rate + '</td><td style="text-align:right">' + item.count + '</td></tr>');
            }
            $('#tbRate').html(html.join(''));

            html = [];
            for (var i = 0; i < json.countries.length; i++) {
                var item = json.countries[i];
                html.push('<tr><td>' + item.country + '</td><td style="text-align:right">' + item.count + '</td></tr>');
            }
            $('#tbCountry').html(html.join(''));

            html = [];
            for (var i = 0; i < json.genres.length; i++) {
                var item = json.genres[i];
                html.push('<tr><td>' + item.genre + '</td><td style="text-align:right">' + item.count + '</td></tr>');
            }
            $('#tbGenres').html(html.join(''));

            html = [];
            for (var i = 0; i < json.watchTime.length; i++) {
                var item = json.watchTime[i];
                html.push('<tr><td style="text-align:center">' + item.month + '</td><td style="text-align:right">' + item.count + '</td></tr>');
            }
            $('#tbWatchTime').html(html.join(''));
        }
    })
}

function update() {
    $.post('/douban/update', { user: $('#txt').val() }, function (data) {

        $('#divMsg').html(data);
    })
}

$(document).ready(function () {
    read('staybird');
});