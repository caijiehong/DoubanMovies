
/*
 * GET home page.
 */

exports.index = function (req, res) {
    var query = req.query;

    res.render('index', query);
};