var t = require("../../@babel/runtime/helpers/typeof"), a = getApp();

Page({
    data: {
        selectById: 1,
        selectedId: 0,
        typeArr: [],
        indexCount: 19,
        pickerCountArray: [],
        timulist: [],
        showMask: !1,
        showGradeDialog: !1,
        showTiliangDialog: !1,
        bygrade_back_color: [],
        bygrade_front_color: [],
        bygrade_title_arr: [],
        bytixing_back_color: [],
        bytixing_front_color: [],
        bytixing_title_arr: [],
        pageList: [],
        tiliang_tips: "当前题量选择：1页20题，打印方式:直接写得数",
        bypage_title_arr: [ "1页", "2页", "3页", "4页", "5页", "6页" ],
        bypage_back_color: [ "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7" ],
        bypage_front_color: [ "#000", "#000", "#000", "#000", "#000", "#000" ],
        bycount_title_arr: [ "10", "20", "40", "50", "100", "自定义" ],
        bycount_back_color: [ "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7" ],
        bycount_front_color: [ "#000", "#000", "#000", "#000", "#000", "#000" ],
        tiliangTitle: "题量 1页",
        tiliangById: 1,
        tiliangSelectedId: 0,
        printCount: 20,
        pageNum: 1,
        allStarArray: [ 1, 2, 3, 4, 5 ],
        stars_arr: [],
        nousePara: 0
    },
    onLoad: function(e) {
        this.initCountPicker();
        var i = wx.getStorageSync("nianji");
        "string" == typeof i ? (a.globalData.selectedId = 0, this.setData({
            showMask: !0,
            showGradeDialog: !0
        })) : (i > 6 && (i = 1), a.globalData.selectedId = i - 1);
        var o = a.globalData.selectById, n = a.globalData.selectedId;
        this.loadTimu(o, n);
        var l = wx.getStorageSync("pageList");
        "object" == t(l) ? this.data.pageList = l : (console.log("从数据库下载数据"), this.loadPageTimuNum()), 
        this.updateTiliangDialog(), this.updateGradeDialog();
    },
    loadTimu: function(e, i) {
        var o = [], n = a.globalData.tikuVersionIsChanged;
        if (1 == e) {
            o = [ "一年级", "二年级", "三年级", "四年级", "五年级", "六年级" ];
            var l = "tikubygrade" + (i + 1), s = wx.getStorageSync(l);
            if ("object" != t(s) || n) this.loadTimuByNianji(i + 1); else {
                this.data.timulist = s, this.setData({
                    timulist: s
                });
                for (var r = [], d = 0; d < s.length; d++) {
                    var g = s[d].xlid;
                    r.push(g);
                }
                var u = a.getStarsArr(r);
                this.setData({
                    stars_arr: u
                });
            }
        } else if (2 == e) {
            o = [ "整数加减运算", "整数乘除运算", "小数加减运算", "小数乘除运算", "分数加减运算", "分数乘除运算", "百分数运算", "因数与倍数", "单位换算练习", "解方程" ];
            l = "tikubydlid" + (i + 1), s = wx.getStorageSync(l);
            if ("object" != t(s) || n) this.loadTimuByDlid(i + 1); else {
                console.log("已经有大类题库!"), this.data.timulist = s, this.setData({
                    timulist: s
                });
                for (r = [], d = 0; d < s.length; d++) {
                    g = s[d].xlid;
                    r.push(g);
                }
                u = a.getStarsArr(r);
                this.setData({
                    stars_arr: u
                });
            }
        }
        a.globalData.selectById = e, a.globalData.selectedId = i, this.setData({
            selectById: e,
            selectedId: i,
            typeArr: o
        });
    },
    loadTimuByNianji: function(t) {
        var e = this, i = "";
        if (1 == a.globalData.localDebug) i = a.globalData.local_url + "gettikubynianji?nianji=" + t; else i = a.globalData.server_bridge + "function=gettikubynianji&nianji=" + t;
        wx.request({
            url: i,
            method: "GET",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(i) {
                var o = i.data.data;
                e.setData({
                    timulist: o
                });
                var n = "tikubygrade" + t;
                wx.setStorageSync(n, o);
                for (var l = [], s = 0; s < o.length; s++) {
                    var r = o[s].xlid;
                    l.push(r);
                }
                var d = a.getStarsArr(l);
                e.setData({
                    stars_arr: d
                });
            }
        });
    },
    loadTimuByDlid: function(t) {
        var e = this, i = "";
        i = 1 == a.globalData.localDebug ? a.globalData.local_url + "gettikubydlid?dlid=" + t : a.globalData.server_bridge + "function=gettikubydlid&dlid=" + t, 
        wx.request({
            url: i,
            method: "GET",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(i) {
                var o = i.data.data;
                e.setData({
                    timulist: o
                });
                var n = "tikubydlid" + t;
                wx.setStorageSync(n, o);
                for (var l = [], s = 0; s < o.length; s++) {
                    var r = o[s].xlid;
                    l.push(r);
                }
                var d = a.getStarsArr(l);
                e.setData({
                    stars_arr: d
                });
            }
        });
    },
    loadPageTimuNum: function() {
        var t = this, e = "";
        e = 1 == a.globalData.localDebug ? a.globalData.local_url + "getpagetimunum" : a.globalData.server_bridge + "function=getpagetimunum", 
        console.log("url=" + e), wx.request({
            url: e,
            method: "GET",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(a) {
                t.data.pageList = a.data.data, wx.setStorageSync("pageList", a.data.data);
            }
        });
    },
    initCountPicker: function() {
        for (var t = [], a = 0; a < 200; a++) t.push(a + 1);
        this.setData({
            indexCount: 19,
            pickerCountArray: t
        });
    },
    btnShowGradeDialog: function() {
        this.setData({
            showMask: !0,
            showGradeDialog: !0
        });
    },
    btnShowTiliangDialog: function(t) {
        this.setData({
            showMask: !0,
            showTiliangDialog: !0
        });
    },
    bindCountPickerChange: function(t) {
        console.log("picker发送选择改变，携带值为", t.detail.value);
        var a = parseInt(t.detail.value) + 1;
        this.setData({
            indexCount: t.detail.value,
            printCount: a
        }), this.updateTiliangDialog();
    },
    btnTimuItem: function(t) {
        var a = t.currentTarget.dataset;
        if ("0|0|0|0" != a.printstyle) if (1001 != a.xlid && 1002 != a.xlid) {
            var e = a.xlid, i = 0, o = -1, n = this.data.tiliangById;
            1 == n ? (o = this.data.pageNum, i = this.getRealTimuNum(e, o)) : 2 == n && (o = -1, 
            i = this.data.printCount);
            var l = "/pages/printview/printview?tiku=" + encodeURIComponent(JSON.stringify(a)) + "&docid=" + "-1&printcount=" + i + "&byid=" + n + "&pagenum=" + o;
            wx.navigateTo({
                url: l,
                success: function() {}
            });
        } else wx.navigateToMiniProgram({
            appId: "wx26be5a4d6585d38d",
            path: "pages/index/index",
            success: function(t) {}
        }); else wx.showToast({
            title: "不支持打印",
            duration: 1e3,
            icon: "success"
        });
    },
    preventTouchMove: function() {},
    btnMask: function(t) {
        console.log("用户click蒙层"), this.setData({
            showMask: !1,
            showGradeDialog: !1,
            showTiliangDialog: !1
        });
    },
    btnCloseDialog: function(t) {
        var a = t.currentTarget.dataset;
        this.setData({
            showMask: !1
        });
        var e = a.dialogid;
        1 == e && this.setData({
            showGradeDialog: !1
        }), 2 == e && this.setData({
            showTiliangDialog: !1
        });
    },
    btnGrade: function(t) {
        var e = t.currentTarget.dataset;
        console.log(e);
        var i = e.byid, o = 0, n = 0, l = 0;
        1 == i ? (l = parseInt(e.grade), o = parseInt(e.grade) + 1, wx.setStorageSync("nianji", o)) : (l = parseInt(e.dlid), 
        n = parseInt(e.dlid) + 1), this.data.selectById = i, this.data.selectedId = l, a.globalData.selectById = i, 
        a.globalData.selectedId = l, console.log("byId=" + i + ";dlid=" + n), this.loadTimu(i, l), 
        this.setData({
            showMask: !1,
            showGradeDialog: !1
        }), this.updateGradeDialog();
    },
    getRealTimuNum: function(t, a) {
        for (var e, i = 0, o = 0, n = this.data.pageList, l = 0; l < n.length; l++) if (n[l].xlid == t) {
            i = n[l].xiedeshuPage1, o = n[l].xiedeshuPage2;
            break;
        }
        return e = i + (a - 1) * o, console.log("xlid=" + t + ",realNum=" + e), e;
    },
    btnTiliangItem: function(t) {
        var a = t.currentTarget.dataset;
        console.log(a);
        var e = a.id, i = a.byid, o = this.data.indexCount, n = -1, l = this.data.pageNum;
        1 == i ? l = e + 1 : 2 == i && 5 != e && (o = (n = a.nums) - 1), -1 != n && (this.data.printCount = n), 
        this.setData({
            tiliangById: i,
            tiliangSelectedId: e,
            indexCount: o,
            pageNum: l
        }), this.updateTiliangDialog();
    },
    updateGradeDialog: function() {
        for (var t = [], a = [], e = [], i = [], o = 0; o < 6; o++) t.push("#f7f7f7"), a.push("#000"), 
        e.push("#f7f7f7"), i.push("#000");
        var n = this.data.selectById, l = this.data.selectedId;
        1 == n ? (t[l] = "#e6fbf4", a[l] = "#0bc78a") : (e[l] = "#e6fbf4", i[l] = "#0bc78a"), 
        this.setData({
            bygrade_title_arr: [ "一年级", "二年级", "三年级", "四年级", "五年级", "六年级" ],
            bytixing_title_arr: [ "整数加减运算", "整数乘除运算", "小数加减运算", "小数乘除运算", "分数加减运算", "分数乘除运算", "百分数运算", "因数与倍数", "单位换算练习" ],
            bygrade_back_color: t,
            bygrade_front_color: a,
            bytixing_back_color: e,
            bytixing_front_color: i
        });
    },
    updateTiliangDialog: function() {
        var t = [ "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7" ], a = [ "#000", "#000", "#000", "#000", "#000", "#000" ], e = [ "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7" ], i = [ "#000", "#000", "#000", "#000", "#000", "#000" ], o = this.data.tiliangById, n = this.data.tiliangSelectedId, l = this.data.tiliangSelectedId, s = this.data.bypage_title_arr, r = this.data.bycount_title_arr, d = "";
        1 == o ? (t[l] = "#e6fbf4", a[l] = "#0bc78a", d = "题量 " + s[l]) : 2 == o && 5 != n ? (e[l] = "#e6fbf4", 
        i[l] = "#0bc78a", d = "题量 " + r[l]) : 2 == o && 5 == n && (e[l] = "#e6fbf4", i[l] = "#0bc78a", 
        d = "题量 " + this.data.printCount), this.setData({
            bypage_back_color: t,
            bypage_front_color: a,
            bycount_back_color: e,
            bycount_front_color: i,
            tiliangTitle: d
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