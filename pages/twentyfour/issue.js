Page({
    data: {
        inputvalue: ""
    },
    onLoad: function(t) {},
    btnSearch: function() {
        if ("" != this.data.inputvalue) {
            var t = "https://www.xiaoxuestudy.com/kousuan_v2/bridge.php?function=get24diantikubytimu&timu=" + this.data.inputvalue;
            wx.request({
                url: t,
                success: function(t) {
                    console.log(t.data);
                    var n = t.data;
                    if (0 == n.code) wx.showToast({
                        title: "该组数字无法计算出24点",
                        icon: "none"
                    }); else {
                        var i = n.data.daan1, a = n.data.daan2, e = n.data.daan3, o = i;
                        null != a && (o = o + "\r\n" + a), null != e && (o = o + "\r\n" + e), wx.showModal({
                            title: "解题思路",
                            showCancel: !1,
                            content: o,
                            confirmText: "我知道了",
                            confirmColor: "#3abccc",
                            success: function(t) {}
                        });
                    }
                }
            });
        } else wx.showToast({
            title: "请输入4个小于14的数字，用逗号或空格隔开",
            icon: "none"
        });
    },
    bindblur: function(t) {
        this.data.inputvalue = this.getword(t);
    },
    getword: function(t) {
        var n = [ 0, 0, 0, 0 ], i = t.detail.value.trim(), a = [];
        if (4 != (a = i.split(/[\s+,，]/)).length && 4 != (a = i.split("")).length) return "";
        for (var e = 0; e < 4; e++) {
            if (!this.isNum(a[e])) return "";
            n[e] = parseInt(a[e], 10);
        }
        n.sort(function(t, n) {
            return t > n ? 1 : -1;
        });
        var o = "";
        for (e = 0; e < 4; e++) {
            if (e > 0 && (o += "-"), n[e] > 13) return "";
            o += n[e];
        }
        return o;
    },
    isNum: function(t) {
        return !isNaN(t);
    },
    btnjq: function(t) {
        wx.navigateTo({
            url: "/pages/twentyfour/article?articleurl=https://mp.weixin.qq.com/s/8odfBt0VAg9A3B9AjLyczA"
        });
    },
    onReady: function() {},
    onShow: function() {},
    onHide: function() {},
    onUnload: function() {},
    onPullDownRefresh: function() {},
    onReachBottom: function() {},
    onShareAppMessage: function() {
        return {
            title: "口算天天练，进步看得见！",
            imageUrl: "/img/share.jpg",
            desc: "口算天天练，进步看得见！",
            path: "/pages/index/index"
        };
    }
});