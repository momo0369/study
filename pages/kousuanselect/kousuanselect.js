var a = require("../../@babel/runtime/helpers/typeof"), t = getApp();

Page({
    data: {
        selectById: 1,
        selectedId: 0,
        typeArr: [],
        bygrade_back_color: [],
        bygrade_front_color: [],
        bygrade_title_arr: [],
        bytixing_back_color: [],
        bytixing_front_color: [],
        bytixing_title_arr: [],
        indexCount: 19,
        pickerCountArray: [],
        timulist: [],
        showMask: !1,
        showGradeDialog: !1,
        allStarArray: [ 1, 2, 3, 4, 5 ],
        stars_arr: [],
        nousePara: 0
    },
    onLoad: function(a) {
        this.initCountPicker();
        var e = wx.getStorageSync("nianji");
        "string" == typeof e ? (t.globalData.selectedId = 0, this.setData({
            showMask: !0,
            showGradeDialog: !0
        })) : (e > 6 && (e = 1), t.globalData.selectedId = e - 1);
        var i = t.globalData.selectById, o = t.globalData.selectedId;
        this.loadTimu(i, o), this.updateGradeDialog();
    },
    loadTimu: function(e, i) {
        var o = [], r = t.globalData.tikuVersionIsChanged;
        if (1 == e) {
            o = [ "一年级", "二年级", "三年级", "四年级", "五年级", "六年级" ];
            var s = "tikubygrade" + (i + 1), n = wx.getStorageSync(s);
            if ("object" != a(n) || r) this.loadTimuByNianji(i + 1); else {
                this.data.timulist = n, this.setData({
                    timulist: n
                });
                for (var l = [], d = 0; d < n.length; d++) {
                    var c = n[d].xlid;
                    l.push(c);
                }
                var u = t.getStarsArr(l);
                this.setData({
                    stars_arr: u
                });
            }
        } else if (2 == e) {
            o = [ "整数加减运算", "整数乘除运算", "小数加减运算", "小数乘除运算", "分数加减运算", "分数乘除运算", "百分数运算", "因数与倍数", "单位换算练习", "解方程" ];
            s = "tikubydlid" + (i + 1), n = wx.getStorageSync(s);
            if ("object" != a(n) || r) this.loadTimuByDlid(i + 1); else {
                console.log("已经有大类题库!"), this.data.timulist = n, this.setData({
                    timulist: n
                });
                for (l = [], d = 0; d < n.length; d++) {
                    c = n[d].xlid;
                    l.push(c);
                }
                u = t.getStarsArr(l);
                this.setData({
                    stars_arr: u
                });
            }
        }
        t.globalData.selectById = e, t.globalData.selectedId = i, this.setData({
            selectById: e,
            selectedId: i,
            typeArr: o
        });
    },
    loadTimuByNianji: function(a) {
        var e = this, i = "";
        i = 1 == t.globalData.localDebug ? t.globalData.local_url + "gettikubynianji?nianji=" + a : t.globalData.server_bridge + "function=gettikubynianji&nianji=" + a, 
        console.log("url=" + i), wx.request({
            url: i,
            method: "GET",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(i) {
                console.log(i.data.data);
                var o = i.data.data;
                e.setData({
                    timulist: o
                });
                var r = "tikubygrade" + a;
                wx.setStorageSync(r, o);
                for (var s = [], n = 0; n < o.length; n++) {
                    var l = o[n].xlid;
                    s.push(l);
                }
                var d = t.getStarsArr(s);
                e.setData({
                    stars_arr: d
                });
            }
        });
    },
    loadTimuByDlid: function(a) {
        var e = this, i = "";
        i = 1 == t.globalData.localDebug ? t.globalData.local_url + "gettikubydlid?dlid=" + a : t.globalData.server_bridge + "function=gettikubydlid&dlid=" + a, 
        console.log("url=" + i), wx.request({
            url: i,
            method: "GET",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(i) {
                console.log(i.data.data), console.log("从数据库中下载大类数据");
                var o = i.data.data;
                e.setData({
                    timulist: o
                });
                var r = "tikubydlid" + a;
                wx.setStorageSync(r, o);
                for (var s = [], n = 0; n < o.length; n++) {
                    var l = o[n].xlid;
                    s.push(l);
                }
                var d = t.getStarsArr(s);
                e.setData({
                    stars_arr: d
                });
            }
        });
    },
    updateGradeDialog: function() {
        for (var a = [], t = [], e = [], i = [], o = 0; o < 6; o++) a.push("#f7f7f7"), t.push("#000"), 
        e.push("#f7f7f7"), i.push("#000");
        var r = this.data.selectById, s = this.data.selectedId;
        1 == r ? (a[s] = "#e6fbf4", t[s] = "#0bc78a") : (e[s] = "#e6fbf4", i[s] = "#0bc78a"), 
        this.setData({
            bygrade_title_arr: [ "一年级", "二年级", "三年级", "四年级", "五年级", "六年级" ],
            bytixing_title_arr: [ "整数加减运算", "整数乘除运算", "小数加减运算", "小数乘除运算", "分数加减运算", "分数乘除运算", "百分数运算", "因数与倍数", "单位换算练习", "认识时间" ],
            bygrade_back_color: a,
            bygrade_front_color: t,
            bytixing_back_color: e,
            bytixing_front_color: i
        });
    },
    initCountPicker: function() {
        for (var a = [], t = 0; t < 200; t++) a.push(t + 1);
        this.setData({
            indexCount: 19,
            pickerCountArray: a
        });
    },
    btnShowGradeDialog: function() {
        this.setData({
            showMask: !0,
            showGradeDialog: !0
        });
    },
    bindCountPickerChange: function(a) {
        console.log("picker发送选择改变，携带值为", a.detail.value), this.setData({
            indexCount: a.detail.value
        });
    },
    btnTimuItem: function(a) {
        console.log(a.currentTarget);
        var t = a.currentTarget.dataset;
        if (1001 != t.xlid && 1002 != t.xlid) {
            var e = "/pages/timu2/" + t.page + "?tiku=" + encodeURIComponent(JSON.stringify(t)) + "&docid=" + -1;
            wx.navigateTo({
                url: e,
                success: function() {}
            });
        } else wx.navigateToMiniProgram({
            appId: "wx26be5a4d6585d38d",
            path: "pages/index/index",
            success: function(a) {}
        });
    },
    preventTouchMove: function() {},
    btnCloseDialog: function(a) {
        a.currentTarget.dataset.id;
        this.setData({
            showMask: !1,
            showGradeDialog: !1
        });
    },
    btnGrade: function(a) {
        var e = this, i = a.currentTarget.dataset;
        console.log(i);
        var o = i.byid, r = 0, s = 0, n = 0;
        if (1 == o ? (n = parseInt(i.grade), r = parseInt(i.grade) + 1, wx.setStorageSync("nianji", r)) : (n = parseInt(i.dlid), 
        s = parseInt(i.dlid) + 1), this.data.selectById = o, this.data.selectedId = n, t.globalData.selectById = o, 
        t.globalData.selectedId = n, 2 == o && 10 == s) return console.log("跳转到认识时间小程序"), 
        void wx.navigateToMiniProgram({
            appId: "wx26be5a4d6585d38d",
            path: "pages/index/index",
            success: function(a) {
                e.setData({
                    showMask: !1,
                    showGradeDialog: !1
                });
            }
        });
        this.setData({
            showMask: !1,
            showGradeDialog: !1
        }), this.updateGradeDialog(), this.loadTimu(o, n);
    },
    btnMask: function(a) {
        console.log("clik mask"), 1 == a.currentTarget.dataset.dialogid && this.setData({
            showMask: !1,
            showGradeDialog: !1
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