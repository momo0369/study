var o = getApp();

Page({
    data: {},
    onLoad: function(n) {
        console.log(n);
        var e = JSON.parse(n.params);
        console.log("params=" + e), console.log("docid=" + e.docid);
        var t = e.tiku, i = e.docid, c = e.printcount, a = e.byid, d = n.pagenum, s = o.globalData.server_bridge + "function=getdoc&docid=" + i;
        console.log(s), wx.showLoading({
            title: "加载中"
        }), wx.request({
            url: s,
            method: "GET",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(o) {
                console.log(o.data), 0 == o.data.code && (i = -1, a = 2, d = -1), wx.redirectTo({
                    url: "/pages/printview/printview?tiku=" + encodeURIComponent(JSON.stringify(t)) + "&docid=" + i + "&printcount=" + c + "&byid=" + a + "&pagenum=" + d,
                    success: function() {}
                });
            },
            complete: function(o) {
                wx.hideLoading();
            }
        });
    },
    onReady: function() {},
    onShow: function() {},
    onHide: function() {},
    onUnload: function() {},
    onPullDownRefresh: function() {},
    onReachBottom: function() {},
    onShareAppMessage: function() {}
});