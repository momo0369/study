var e = require("../../@babel/runtime/helpers/typeof"), a = getApp();

Page({
    data: {
        moduleHeight: 30,
        moduleMargin: 10,
        modalStatus: "none",
        messageWidth: 360,
        adunit: "adunit-c408f65a230dde94",
        adWidth: 360,
        showHongdian: 1,
        nouuse: 0
    },
    onLoad: function(n) {
        var t = wx.getSystemInfoSync().screenWidth, o = .95 * (t - 20), i = o, s = o, r = "10px auto";
        wx.getSystemInfoSync().screenHeight / t > 2 && (r = "30px auto");
        var g = .28 * o;
        this.setData({
            moduleMargin: r,
            moduleHeight: g,
            adWidth: i,
            messageWidth: s
        }), wx.hideTabBar({}), "string" == typeof wx.getStorageSync("showHongdian") ? a.globalData.showHongdian = 1 : (a.globalData.showHongdian = 0, 
        this.setData({
            showHongdian: 0
        }));
        var l = wx.getStorageSync("local_stars");
        console.log(e(l)), "object" == e(l) ? a.globalData.local_stars = l : (a.globalData.local_stars = [], 
        wx.setStorageSync("local_stars", a.globalData.local_stars)), this.loadVersion();
    },
    btnOnlineKousuan: function() {
        wx.navigateTo({
            url: "/pages/kousuanselect/kousuanselect",
            success: function() {}
        });
    },
    btnDownload: function() {
        wx.navigateTo({
            url: "/pages/printselect/printselect",
            success: function() {}
        });
    },
    btndian24: function() {
        wx.navigateTo({
            url: "../twentyfour/index",
            success: function() {}
        });
    },
    btnLearntime: function() {
        wx.navigateToMiniProgram({
            appId: "wx26be5a4d6585d38d",
            path: "pages/index/index",
            success: function(e) {}
        });
    },
    btnDanci: function() {
        wx.navigateToMiniProgram({
            appId: "wx61062abdd2cd2062",
            path: "pages/index/index",
            success: function(e) {
                console.log("success!");
            }
        });
    },
    btnShengzici: function() {
        wx.navigateToMiniProgram({
            appId: "wx4e37ef0e85854087",
            path: "pages/index/index",
            success: function(e) {}
        });
    },
    btnHanoi: function() {
        wx.navigateToMiniProgram({
            appId: "wx142d07941d69604d",
            path: "pages/index/index",
            success: function(e) {}
        });
    },
    btnYinbiao: function() {
        wx.navigateToMiniProgram({
            appId: "wxede7ed92777eb330",
            path: "pages/index/index",
            success: function(e) {}
        });
    },
    loadVersion: function() {
        var e = "";
        e = 1 == a.globalData.localDebug ? a.globalData.local_url + "getversion" : a.globalData.server_bridge + "function=getversion", 
        console.log("url=" + e), wx.request({
            url: e,
            method: "GET",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(e) {
                var n = e.data.data, t = n[0].version, o = n[1].version, i = wx.getStorageSync("tikuVersion"), s = wx.getStorageSync("printviewVersion");
                "number" == typeof i ? i < t ? (a.globalData.tikuVersionIsChanged = !0, wx.setStorageSync("tikuVersion", t), 
                wx.getStorageInfo({
                    success: function(e) {
                        for (var a = e.keys, n = 0; n < a.length; n++) {
                            var t = a[n];
                            "unionId" != t && "nickname" != t && "nianji" != t && "tikuVersion" != t && "printviewVersion" != t && wx.removeStorageSync(t);
                        }
                    }
                })) : (a.globalData.tikuVersionIsChanged = !1, a.globalData.debugMode && (a.globalData.tikuVersionIsChanged = !0)) : (a.globalData.tikuVersionIsChanged = !0, 
                wx.setStorageSync("tikuVersion", t)), "number" == typeof s ? s < o ? (a.globalData.printviewVersionIsChanged = !0, 
                wx.setStorageSync("printviewVersion", o), wx.getStorageInfo({
                    success: function(e) {
                        for (var a = e.keys, n = 0; n < a.length; n++) {
                            var t = a[n];
                            "unionId" != t && "nickname" != t && "nianji" != t && "tikuVersion" != t && "printviewVersion" != t && wx.removeStorageSync(t);
                        }
                    }
                })) : (a.globalData.printviewVersionIsChanged = !1, a.globalData.debugMode && (a.globalData.printviewVersionIsChanged = !0)) : (a.globalData.printviewVersionIsChanged = !0, 
                wx.setStorageSync("printviewVersion", o));
            }
        });
    },
    onShareAppMessage: function() {
        return {
            title: a.globalData.sharetitle,
            desc: a.globalData.sharetitle,
            imageUrl: a.globalData.sharebgimgurl,
            path: "/pages/index/index"
        };
    }
});