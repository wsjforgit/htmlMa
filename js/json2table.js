// json 转换 table
// 作者：mdz
(function ($) {
    // data json数据
    // keys 要跨行的列名
    function makeTable(data,keys) {
        // 判断data不是json数据返回空
        if(typeof(data)!=="object" || Object.prototype.toString.call(data).toLowerCase()!="[object array]" || !data.length){
            return '';
        }
        // 判断keys不是字符串返回空
        if(typeof(keys)!=="string"){
            return '';
        }
        var tr = "<tbody>"
        var arr = [];
        for (var i = 0; i < data.length; i++) {
            if (arr.length == 0 && i == 0) {
                arr[i] = data[i][keys];
                tr += "<tr>";
                for(key in data[i]){
                    if(keys===key){
                        tr +="<td rowspan='"+countSubstr(data, data[i][key])+"'>" + data[i][key] + "</td>";
                    } else {
                        tr +="<td>" + data[i][key] + "</td>";
                    }
                }
                tr +="</tr>";
            } else {
                if ($.inArray(data[i][keys], arr) < 0) {
                    arr[arr.length] = data[i][keys];
                    tr += "<tr>";
                    for(key in data[i]){
                        if(keys===key){
                            tr +="<td rowspan='"+countSubstr(data, data[i][key])+"'>" + data[i][key] + "</td>";
                        } else {
                            tr +="<td>" + data[i][key] + "</td>";
                        }
                    }
                    tr +="</tr>";
                } else {
                    tr += "<tr>";
                    for(key in data[i]){
                        if(keys!==key){
                            tr +="<td>" + data[i][key] + "</td>";
                        }
                    }
                    tr +="</tr>";
                }
            }
        }
        tr = tr + "</tbody>";
        $(this).append(tr);
    };
    // 查询字符串出现次数
    function countSubstr(str, substr) {
        var str = JSON.stringify(str);
        var count;
        var reg = "/" + substr + "/gi"; // 查找忽略大小写
        reg = eval(reg);
        if (str.match(reg) == null) {
            return 0;
        } else {
            count = str.match(reg).length;
        }
        return count;
    }
    $.fn.extend({
        json2table: makeTable
    });
})(jQuery)