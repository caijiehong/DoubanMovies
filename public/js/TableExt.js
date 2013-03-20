LoadExt = {
    InitLoading: function () {
        var div_loading = LoadExt.$('div_loading');
        if (!div_loading) {
            div_loading = document.createElement('div');
            div_loading.setAttribute('id', 'div_loading');
            div_loading.setAttribute('class', 'div_loading');
            div_loading.style['display'] = 'none';
            document.body.appendChild(div_loading);
        }

        var div_bg = LoadExt.$('div_bg');
        if (!div_bg) {
            div_bg = document.createElement('div');
            div_bg.setAttribute('id', 'div_bg');
            div_bg.setAttribute('class', 'bgenable');
            div_bg.style['display'] = 'none';
            document.body.appendChild(div_bg);
        }
    },
    loading: function () {
        LoadExt.InitLoading();
        LoadExt.$('div_loading').style['display'] = '';
        LoadExt.$('div_bg').style['display'] = '';
    },
    unloading: function () {
        LoadExt.InitLoading();
        LoadExt.$('div_loading').style['display'] = 'none';
        LoadExt.$('div_bg').style['display'] = 'none';
    },
    $: function (id) {
        return document.getElementById(id);
    }
};

jQuery.fn.extend({
    NewTable: function (url, trRender, getParams, pageSize) {
        this.URL = url;
        this.TRRender = trRender;
        this.GetParams = getParams;
        this.PageSize = pageSize || 300;
        this.PageNow = 1;
        this.Order = '';
        this.LastParams = null;
        this.LastData = null;
        this.OnJsonLoaded = null;
        this.GetListData = null;

        //为可排序字段绑定点击事件
        var ths = this.find('th[order]');
        var i = ths.length;
        while (i-- > 0) {
            ths.eq(i).bind('click', { table: this }, function (event) {
                if (event.target == this || (!$(event.target).attr('onclick') && !event.target.onclick)) {//防止事件重复触发
                    var order = $(this).attr('order').split(',');
                    var table = event.data.table;
                    var newOrder = table.Order == order[0] ? order[1] : order[0];
                    table.OrderBy(newOrder);
                }
            }).css('cursor', 'pointer');
        }

        this.LoadData = function (LoadSet) {

            LoadSet = LoadSet || {};

            var params = this.GetParams(LoadSet.context);
            if (this.LastParams == null || !Compare(params, this.LastParams)) {
                this.LastParams = params;
                LoadSet.pageIndex = 1; //参数变化时重新搜索第一页
            }

            params['pagenow'] = pageIndex = LoadSet.pageIndex || this.PageNow;
            params['order'] = order = LoadSet.order || this.Order;
            params['pageSize'] = this.PageSize;

            $.ajaxLoad({
                type: 'POST',
                url: this.URL,
                dataType: 'json',
                cache: false,
                data: params,
                context: this,
                success: function (json) {
                    if (this.OnJsonLoaded) {
                        this.OnJsonLoaded(json);
                    }
                    this.PageNow = pageIndex;
                    this.Order = order;

                    $(this).find('tbody').empty();

                    var needPage = json.length == 2 && $.isArray(json[1]);
                    var data = this.GetListData ? this.GetListData(json) : json;
                    this.LastData = data;
                    var html = '';
                    for (var i = 0; i < data.length; i++) {
                        html += trRender(i, data[i], (pageIndex - 1) * this.PageSize + i + 1);
                    }
                    if (html.length == 0) {
                        html = '<td style="text-align:left;padding-left:10px;" colspan="' + $(this).find('thead th').length + '">No record found!</td>';
                    }

                    $(this).find('tbody').html(html).find('tr').each(function () {
                        $(this).bind('mouseover', function () { this.style.backgroundColor = '#ccc'; })
                    .bind('mouseout', function () { this.style.backgroundColor = ''; });
                    });

                    if (needPage && this.LoadPageDiv(pageIndex, json[0]['RecordCount'])) {//出现分页之后就取消JS排序
                        ts_disableSortable(this[0]);
                    } else {
                        ts_makeSortable(this[0]);
                    }
                }
            });
        }

        this.LoadPageDiv = function (pageNow, recordCount) {
            var pageSize = this.PageSize;
            var html = '';

            var pageCount = parseInt(recordCount / pageSize) + (recordCount % pageSize == 0 ? 0 : 1);

            if (pageCount > 1) {
                var j = (pageNow - 6 > 0 ? pageNow - 6 : 0);
                if (j > 0) {
                    html += '&nbsp<a href="#" pg="1">&lt;&lt;</a>';
                    html += '&nbsp<a href="#" pg="' + (pageNow - 5) + '">...</a>';
                }

                var i = j;
                for (; i < pageCount && i < j + 10; i++) {
                    var ar = (pageNow == i + 1) ? '&nbsp' + (i + 1).toString() : '&nbsp<a href="#" pg="' + (i + 1) + '">' + (i + 1) + '</a>';
                    html += ar;
                }
                if (i < pageCount) {
                    html += '&nbsp<a href="#" pg="' + (pageNow + 5) + '">...</a>';
                    html += '&nbsp<a href="#" pg="' + pageCount + '">&gt;&gt;</a>';
                }
            }

            if ($('.div_Page').length == 0) {
                var div = '<div class="div_Page"></div>';
                $(this).before(div).after(div);
            }

            $('.div_Page').html(html);
            if (html) {
                $('.div_Page').show();
                $('.div_Page a').bind('click', { table: this }, function (event) {
                    event.data.table.LoadData({ pageIndex: $(this).attr('pg') });
                });
            }
            else $('.div_Page').hide();

            return html != '';
        }

        this.OrderBy = function (order) {
            this.LoadData({ order: order });
        }

        return this;
    }
});

jQuery.extend({
    ajaxLoad: function (set) {
        $.ajax($.padLoading(set));
    },
    postLoad: function (url, data, callback, type) {
        // shift arguments if data argument was omited
        if (jQuery.isFunction(data)) {
            type = type || callback;
            callback = data;
            data = {};
        }

        var set = {
            type: "POST",
            url: url,
            data: data,
            success: callback,
            dataType: type
        };

        return jQuery.ajax($.padLoading(set));
    },
    padLoading: function (set) {

        set.beforeSend = function () { LoadExt.loading(); };

        set.complete = function () { LoadExt.unloading(); };

        set.error = function () { alert('Server error, please try again later!'); }

        return set;
    }
});

//
//Compare object function
//
function Compare(fobj, sobj) {
    var ftype = typeof (fobj);
    var stype = typeof (sobj);

    if (ftype == stype) {
        if (ftype == "object") {
            if (fobj.constructor == Array && sobj.constructor == Array)//array
            {
                return CompareArray(fobj, sobj)
            }
            else if (fobj.constructor != Array && sobj.constructor != Array)//object
            {
                return CompareObject(fobj, sobj);
            }
            return false;
        }

        return fobj == sobj;
    }

    return false;
}

function CompareObject(fobj, sobj) {
    for (var ele in fobj) {
        if (sobj[ele] == undefined) return false;

        if (!Compare(fobj[ele], sobj[ele])) {
            return false;
        }
    }

    return true;
}

function CompareArray(farr, sarr) {
    if (farr.length != sarr.length) {
        return false;
    }

    for (var i = 0; i < farr.length; i++) {
        if (!Compare(farr[i], sarr[i])) {
            return false;
        }
    }

    return true;
}