var a = getApp();

Page({
    data: {
        tiku: {},
        url: "",
        showMask: !1,
        showNicknameDialog: !1,
        nickname: "",
        orginal_nickname: "",
        button_forecolor: "#4c4c4c",
        button_backcolor: "#f7f7f7",
        button_bordercolor: "#f7f7f7",
        xlname: "",
        timecost: 0,
        score: 0,
        rank: 0,
        programid: 1,
        fromshare: 0,
        nouse: 0
    },
    onLoad: function(t) {
        var n = t.programid, o = t.xlname, e = t.timecost, i = t.score, s = t.rank, c = t.nickname, r = t.fromshare;
        1 != r && "24点" != o && (this.data.tiku = JSON.parse(decodeURIComponent(t.tiku))), 
        (null == o || "string" == typeof o && "" === o.trim()) && (o = "口算天天练");
        var l = "";
        0 == (c = (c = c.replace(/\|/g, "_")).replace(/[^\w\u4e00-\u9fa5-]/g, "")).length && (c = "亲爱的"), 
        l = 1 == a.globalData.localDebug ? a.globalData.local_url + "downloadjiangzhuang?nickname=" + c + "&xlname=" + o + "&timecost=" + e + "&score=" + i + "&rank=" + s + "&programid=" + n : a.globalData.server_bridge + "function=downloadjiangzhuang&nickname=" + c + "&xlname=" + o + "&timecost=" + e + "&score=" + i + "&rank=" + s + "&programid=" + n, 
        console.log(l), wx.showLoading({
            title: "加载中"
        });
        var u = this;
        wx.request({
            url: l,
            method: "GET",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(a) {
                console.log(a.data.data);
                var t = "https://www.xiaoxuestudy.com/kousuan_v2/pdf/" + a.data.data;
                console.log("url:" + t), u.setData({
                    url: t
                });
            },
            complete: function(a) {
                wx.hideLoading();
            }
        }), this.data.orginal_nickname = c, this.setData({
            nickname: c,
            fromshare: r,
            xlname: o
        }), this.data.nickname = c, this.data.programid = n, this.data.xlname = o, this.data.timecost = e, 
        this.data.score = i, this.data.rank = s;
    },
    preventTouchMove: function() {},
    handleChange: function(a) {
        var t = a.detail.value;
        this.data.nickname = t;
        var n = "#4c4c4c", o = "#f7f7f7", e = "#f7f7f7";
        t != this.data.orginal_nickname && 0 != t.length && (n = "#fff", o = "#4eb460", 
        e = "#4eb460"), this.setData({
            button_forecolor: n,
            button_backcolor: o,
            button_bordercolor: e
        });
    },
    btnConfirmNickname: function() {
        var a = "";
        0 == this.data.nickname.length ? (a = "请输入昵称", wx.showToast({
            title: a,
            icon: "success"
        })) : this.data.nickname != this.data.orginal_nickname && (a = "修改成功", wx.setStorageSync("nickname", this.data.nickname), 
        wx.showToast({
            title: a,
            duration: 1e3,
            icon: "success"
        }), this.data.orginal_nickname = this.data.nickname, this.setData({
            nickname: this.data.nickname
        }), this.setData({
            showNicknameDialog: !1,
            showMask: !1
        }));
    },
    btnMask: function(a) {
        a.currentTarget.dataset.dialogid;
        this.setData({
            showMask: !1,
            showNicknameDialog: !1
        });
    },
    btnCloseDialog: function() {
        this.setData({
            showMask: !1,
            showNicknameDialog: !1
        });
    },
    btnShowNicknameDialog: function() {
        this.setData({
            showMask: !0,
            showNicknameDialog: !0
        });
    },
    btnXiangce: function() {
        var a = this;
        this.data.saving = !0, wx.getSetting({
            success: function(t) {
                t.authSetting["scope.writePhotosAlbum"] ? a.saveImage() : wx.authorize({
                    scope: "scope.writePhotosAlbum",
                    success: function() {
                        a.saveImage();
                    },
                    fail: function() {
                        wx.openSetting({
                            success: function(a) {
                                console.log("openSetting success");
                            },
                            fail: function(a) {
                                console.log("openSetting fail");
                            }
                        });
                    }
                });
            },
            fail: function(a) {
                console.log(a);
            }
        });
    },
    saveImage: function() {
        wx.showLoading({
            title: "加载中",
            mask: !0
        });
        wx.getImageInfo({
            src: this.data.url,
            success: function(a) {
                wx.saveImageToPhotosAlbum({
                    filePath: a.path,
                    success: function(a) {
                        wx.showToast({
                            title: "已保存到相册"
                        });
                    }
                });
            }
        }), wx.hideLoading();
    },
    btnHome: function() {
        var t = a.globalData.miniprogramId, n = "/pages/index/index";
        1 == t ? (n = "/pages/index/index", wx.switchTab({
            url: n
        })) : 2 == t && (n = "/pages/twentyfour/index", wx.reLaunch({
            url: n
        }));
    },
    btnAgain: function() {
        var a = this.data.tiku, t = "/pages/timu2/" + a.page + "?tiku=" + encodeURIComponent(JSON.stringify(a)) + "&docid=" + -1;
        wx.navigateTo({
            url: t,
            success: function() {}
        });
    },
    onReady: function() {},
    onShow: function() {},
    onHide: function() {},
    onUnload: function() {},
    onPullDownRefresh: function() {},
    onReachBottom: function() {},
    onShareAppMessage: function() {
        var a = this.data.programid, t = this.data.xlname, n = this.data.timecost, o = this.data.score, e = this.data.rank, i = "/pages/jiangzhuang/jiangzhuang?&nickname=" + this.data.nickname + "&xlname=" + t + "&timecost=" + n + "&score=" + o + "&rank=" + e + "&programid=" + a + "&fromshare=1";
        console.log(i);
        var s = "";
        return s = "口算练习我得了" + o + "分", (2 == a || 1 == a && "24点" == t) && (s = "24点闯关成功!"), 
        {
            title: s,
            path: i
        };
    }
});