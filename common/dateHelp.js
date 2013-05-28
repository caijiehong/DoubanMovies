//日期格式转换
exports.formatStr = function (str, format) {
    if (!str) return '';

    var i = parseInt(str.match(/[-]*\d+/g)[0]);
    if (i < 0) return '';
    var d = new Date(i);

    return formatDate(d, format);
}

exports.formatDate = formatDate = function (d, format) {
    if (d.toString() == 'Invalid Date') return '';

    //处理客户端时区不同导致的问题
    //480 是UTC+8
    d.setMinutes(d.getMinutes() + (d.getTimezoneOffset() + 480));

    format = format || 'MM/dd hh:mm:ss tt';

    var hour = d.getHours();
    var month = formatNum(d.getMonth() + 1)

    var re = format.replace('YYYY', d.getFullYear())
        .replace('YY', formatNum(d.getFullYear() % 100))
        .replace('MM', formatNum(month))
        .replace('dd', formatNum(d.getDate()))
        .replace('hh', hour == 0 ? '12' : formatNum(hour <= 12 ? hour : hour - 12))
        .replace('HH', formatNum(hour))
        .replace('mm', formatNum(d.getMinutes()))
        .replace('ss', formatNum(d.getSeconds()))
        .replace('tt', (hour < 12 ? 'AM' : 'PM'));

    return re;
}

function formatNum(num) {
    num = Number(num);
    return num < 10 ? ('0' + num) : num.toString();
}