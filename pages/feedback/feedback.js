var t = getApp();

Page({
    data: {
        timu: "",
        value: ""
    },
    onLoad: function(n) {
        this.data.timu = t.globalData.timu_feedback, console.log("timu=" + this.data.timu);
    },
    btnConfirm: function() {
        var n = this.data.value, a = this.data.timu;
        if (n.length < 5) wx.showToast({
            title: "字数太少",
            duration: 800,
            icon: "success"
        }); else {
            var e = t.globalData.server_root;
            a = JSON.stringify(a);
            var o = e + "/kousuan_v1/feedback.php?timu=" + (a = encodeURI(a).replace(/\+/g, "%2B")) + "&feedback=" + n;
            console.log(o), wx.request({
                url: o,
                data: {},
                header: {
                    "content-type": "application/json"
                },
                success: function(t) {}
            }), wx.showToast({
                title: "反馈成功",
                duration: 1e3,
                icon: "success"
            }), setTimeout(function() {
                wx.navigateBack({
                    delta: 0
                });
            }, 1e3);
        }
    },
    btnCancel: function() {
        wx.navigateBack({
            delta: 0
        });
    },
    bindInput: function(t) {
        this.data.value = t.detail.value;
    },
    onReady: function() {},
    onShow: function() {},
    onHide: function() {},
    onUnload: function() {},
    onPullDownRefresh: function() {},
    onReachBottom: function() {},
    onShareAppMessage: function() {}
});