var t = getApp();

Page({
    data: {
        tiku: {},
        screenHeight: 500,
        requestObj: {},
        maskStatus: "none",
        configs: []
    },
    onLoad: function(e) {
        var a = JSON.parse(decodeURIComponent(e.tiku));
        this.data.tiku = a;
        var n = t.globalData.server_url + "/getcfg.php", s = this;
        wx.request({
            url: n,
            method: "POST",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(t) {
                s.setData({
                    configs: t.data.config
                });
            }
        });
        var i = wx.getSystemInfoSync().windowHeight;
        this.setData({
            screenHeight: i
        }), this.setData({
            requestObj: JSON.parse(e.params)
        });
    },
    btntiku: function() {
        wx.redirectTo({
            url: "/pages/kousuanselect/kousuanselect"
        });
    },
    btntiku0: function() {
        var t = "/pages/selection/bytixing";
        "grade" == wx.getStorageSync("selection") && (t = "/pages/selection/bygrade"), wx.redirectTo({
            url: t
        });
    },
    btnHome: function() {
        wx.switchTab({
            url: "/pages/index/index"
        });
    },
    btnagain: function() {
        var t = this.data.tiku, e = "/pages/timu2/" + t.page + "?tiku=" + encodeURIComponent(JSON.stringify(t)) + "&docid=" + -1;
        console.log(e), wx.navigateTo({
            url: e,
            success: function() {
                wx.setStorageSync("selection", "grade");
            }
        });
    },
    openRule: function() {
        this.setData({
            maskStatus: "block"
        });
    },
    closeMask: function() {
        this.setData({
            maskStatus: "none"
        });
    }
});