require("../../@babel/runtime/helpers/Arrayincludes");

var t = require("../../@babel/runtime/helpers/typeof"), a = getApp();

Page({
    data: {
        printCount: 20,
        tiku: {},
        docId: 1e5,
        lastDocId: -1,
        xlid: 1,
        page: "timu",
        flagFenshu: !1,
        docTitle: "5以内加减法",
        reportCol: 4,
        fillCol: 3,
        verticalCol: 3,
        printStyleId: 1,
        timus: [],
        fill_timus: [],
        shushi_timus: [],
        isChufaShushi: 0,
        index: 0,
        array: [ "直接写得数", "填空题", "竖式列式", "竖式留白" ],
        indexCount: 0,
        pickerCountArray: [],
        timuWidth: 166,
        timuSize: 28,
        fillTimuSize: 28,
        titleSize: 28,
        timuBottom: 6,
        showMask: !1,
        showDownloadDialog: !1,
        showPageSetDialog: !1,
        showTiliangDialog: !1,
        showShushiDialog: !1,
        arrFenshu: [],
        setting: 1,
        nameLabel: "姓名",
        scoreLabel: "得分",
        jinju: "口算天天练，进步看得见",
        input1BorderColor: "#bbb",
        input2BorderColor: "#bbb",
        input3BorderColor: "#bbb",
        input4BorderColor: "#bbb",
        xiedeshu_page1: 0,
        xiedeshu_page2: 0,
        fill_page1: 0,
        fill_page2: 0,
        lieshi_page1: 0,
        lieshi_page2: 0,
        liubai_page1: 0,
        liubai_page2: 0,
        tiliang_tips: "当前题量选择：1页20题，打印方式:直接写得数",
        bypage_title_arr: [ "1页", "2页", "3页", "4页", "5页", "6页" ],
        bypage_back_color: [ "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7" ],
        bypage_front_color: [ "#000", "#000", "#000", "#000", "#000", "#000" ],
        bycount_title_arr: [ "10", "20", "40", "50", "100", "自定义" ],
        bycount_back_color: [ "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7" ],
        bycount_front_color: [ "#000", "#000", "#000", "#000", "#000", "#000" ],
        tiliangById: 1,
        tiliangSelectedId: 0,
        shushi_title_arr: [],
        shushi_back_color: [ "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7" ],
        shushi_front_color: [ "#000", "#000", "#000", "#000" ],
        shushiSelectedId: 0,
        download_back_color: [ "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7" ],
        download_front_color: [ "#000", "#000", "#000", "#000", "#000", "#000" ],
        downloadSelectedId: -1,
        showHongdian: 1,
        mypara: 1
    },
    onLoad: function(i) {
        console.log(i);
        var e = JSON.parse(decodeURIComponent(i.tiku)), o = e.xlid, s = e.xlname, l = e.page, n = i.printcount, r = i.docid, d = i.byid, u = i.pagenum, h = 0;
        h = 1 == d ? u - 1 : 10 == n ? 0 : 20 == n ? 1 : 40 == n ? 2 : 50 == n ? 3 : 100 == n ? 4 : 5, 
        this.setData({
            docId: r,
            printCount: n,
            tiku: e,
            xlid: o,
            docTitle: s,
            page: l,
            tiliangById: d,
            tiliangSelectedId: h
        });
        var c = !1;
        -1 != l.indexOf("timu-fenshu") && (c = !0), 90 == o && (c = !0), this.setData({
            flagFenshu: c
        });
        var f = 1;
        20 != o && 22 != o && 142 != o && 148 != o && 143 != o || (f = 2), this.setData({
            printStyleId: f
        });
        var g = a.globalData.showHongdian;
        this.setData({
            showHongdian: g
        });
        var p = "printviewbyxlid" + this.data.xlid, b = wx.getStorageSync(p), m = a.globalData.printviewVersionIsChanged;
        "object" != t(b) || m ? (console.log("从服务器中加载数据"), this.loadPrintSet()) : (console.log("本地缓存已经保存了数据"), 
        this.LocalPrintSet()), this.loadTimu();
    },
    onReady: function() {},
    onShow: function() {},
    onHide: function() {},
    onUnload: function() {},
    onPullDownRefresh: function() {},
    onReachBottom: function() {},
    loadTimu: function() {
        var t = this, i = this.data.xlid, e = "";
        if (-1 == this.data.docId) {
            var o = this.data.printCount, s = this.data.lastDocId;
            e = 1 == a.globalData.localDebug ? a.globalData.local_url + "createdoc?xlid=" + i + "&totalcount=" + o + "&lastdocid=" + s : a.globalData.server_bridge + "function=createdoc&xlid=" + i + "&totalcount=" + o + "&lastdocid=" + s;
        } else e = 1 == a.globalData.localDebug ? a.globalData.local_url + "getdoc?docid=" + this.data.docId : a.globalData.server_bridge + "function=getdoc&docid=" + this.data.docId;
        console.log(e), wx.showLoading({
            title: "加载中"
        }), wx.request({
            url: e,
            method: "GET",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(a) {
                var i = a.data.data.timus, e = a.data.data.docId;
                t.setData({
                    timus: i,
                    printCount: i.length,
                    docId: e
                }), t.createPrintView(), t.initCountPicker(), t.updateTiliangDialog();
            },
            complete: function(t) {
                wx.hideLoading();
            }
        });
    },
    loadPrintSet: function() {
        var t = this, i = this.data.xlid, e = a.globalData.server_bridge + "function=getprintviewbyxlid&xlid=" + i;
        console.log(e), wx.showLoading({
            title: "加载中"
        }), wx.request({
            url: e,
            method: "GET",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(a) {
                var e = a.data.data, o = "printviewbyxlid" + i;
                wx.setStorageSync(o, e), console.log("data=" + JSON.stringify(e)), t.setData({
                    docTitle: e.xlname,
                    reportCol: e.reportCol,
                    fillCol: e.fillCol,
                    verticalCol: e.verticalCol,
                    fillTimuSize: e.fillFontsize,
                    timuSize: e.xiedeshuFontsize
                });
                var s = e.reportCol, l = 166;
                2 == s ? l = 330 : 3 == s ? l = 220 : 4 == s && (l = 166), t.setData({
                    timuWidth: l
                }), t.data.xiedeshu_page1 = e.xiedeshuPage1, t.data.xiedeshu_page2 = e.xiedeshuPage2, 
                t.data.fill_page1 = e.fillPage1, t.data.fill_page2 = e.fillPage2, t.data.lieshi_page1 = e.lieshiPage1, 
                t.data.lieshi_page2 = e.lieshiPage2, t.data.liubai_page1 = e.liubaiPage1, t.data.liubai_page2 = e.liubaiPage2;
                var n = e.printStyle;
                t.setShushiArr(n), t.updateShushiDialog(), t.updateTiliangDialog();
            },
            complete: function(t) {
                wx.hideLoading();
            }
        });
    },
    LocalPrintSet: function() {
        var t = "printviewbyxlid" + this.data.xlid, a = wx.getStorageSync(t);
        this.setData({
            docTitle: a.xlname,
            reportCol: a.reportCol,
            fillCol: a.fillCol,
            verticalCol: a.verticalCol,
            fillTimuSize: a.fillFontsize,
            timuSize: a.xiedeshuFontsize
        });
        var i = a.reportCol, e = 166;
        2 == i ? e = 330 : 3 == i ? e = 220 : 4 == i && (e = 166), this.setData({
            timuWidth: e
        }), this.data.xiedeshu_page1 = a.xiedeshuPage1, this.data.xiedeshu_page2 = a.xiedeshuPage2, 
        this.data.fill_page1 = a.fillPage1, this.data.fill_page2 = a.fillPage2, this.data.lieshi_page1 = a.lieshiPage1, 
        this.data.lieshi_page2 = a.lieshiPage2, this.data.liubai_page1 = a.liubaiPage1, 
        this.data.liubai_page2 = a.liubaiPage2;
        var o = a.printStyle;
        this.setShushiArr(o), this.updateShushiDialog(), this.updateTiliangDialog();
    },
    createPrintView: function() {
        var t = this.data.timuSize + 2, i = this.data.timus, e = this.data.fillTimuSize, o = this.data.printStyleId, s = this.data.xlid;
        if (this.data.flagFenshu) {
            for (var l = [], n = 0; n < i.length; n++) {
                var r = a.buildFenshuExpre(i[n].timu, 1);
                l.push(r);
            }
            this.setData({
                arrFenshu: l
            });
        } else if (1 == o) i = this.setSpecialTimuStyle4Printview(s, i), this.setData({
            timus: i,
            timuBottom: 6
        }); else if (2 == o) {
            t = e + 2;
            i = this.data.timus;
            var d = [];
            if (20 == (s = this.data.xlid) || 22 == s || 148 == s || 142 == s || 143 == s) d = this.setSpecialFillTimuStyle4Printview(s, i), 
            console.log(d); else {
                var u = this.data.fillCol, h = this.getOperatorNum(i[0].timu) + 1;
                d = this.batchSwitchToFillTimu(i, u, h);
            }
            this.setData({
                fill_timus: d
            });
        } else if (3 == o) {
            var c = this.batchSwitchToShushiTimu(i);
            this.setData({
                shushi_timus: c
            });
            var f = 0;
            i[0].timu.includes("÷") && (f = 1), this.setData({
                isChufaShushi: f
            });
        } else 4 == o && this.setData({
            timuBottom: 80
        });
        this.setData({
            titleSize: t
        });
        var g = 6;
        1 == o ? g = 6 : 4 == o && (g = 80), this.setData({
            timuBottom: g
        });
    },
    dealSpecialTixing0: function(t, a) {
        var i = [], e = "";
        if (20 == t) {
            console.log(a);
            for (var o = 0; o < a.length; o++) e = "(  )+" + (e = a[o].timu) + "=100", i.push(e);
        } else if (22 == t) for (o = 0; o < a.length; o++) e = "(  )+" + (e = a[o].timu) + "=1000", 
        i.push(e); else if (148 == t) for (o = 0; o < a.length; o++) e = "(  )+" + (e = a[o].timu) + "=10", 
        i.push(e); else if (142 == t || 143 == t) {
            console.log(a);
            for (o = 0; o < a.length; o++) {
                e = a[o].daan;
                var s = Math.floor(a[o].timu / a[o].daan), l = a[o].timu % a[o].daan;
                e = 0 != l ? "(  )÷" + e + "=" + s + "······" + l : "(  )÷" + e + "=" + s, i.push(e);
            }
        } else 143 == t && console.log(a);
        return i;
    },
    setSpecialFillTimuStyle4Printview: function(t, a) {
        console.log("xlid=" + t + ",timus=" + a[0].timu);
        for (var i = [], e = "", o = 0; o < a.length; o++) {
            if (e = a[o].timu, 20 == t) e = "(  )+" + e + "=100"; else if (22 == t) e = "(  )+" + e + "=1000"; else if (148 == t) e = "(  )+" + e + "=10"; else if (142 == t || 143 == t) {
                e = a[o].daan;
                var s = Math.floor(a[o].timu / a[o].daan), l = a[o].timu % a[o].daan;
                e = 0 != l ? "(  )÷" + e + "=" + s + "······" + l : "(  )÷" + e + "=" + s;
            } else {
                if (81 != t) return a;
                e = e.replace("|", "和"), e += "的最大公因数是(  )", a[o].timu = e;
            }
            i.push(e);
        }
        return console.log(i), i;
    },
    setSpecialTimuStyle4Printview: function(t, a) {
        for (var i = 0; i < a.length; i++) {
            var e = a[i].timu;
            if (81 == t) {
                var o = e.split("|").map(Number);
                e = o[0] + "和" + o[1] + "( )";
            } else if (82 == t) {
                o = e.split("|").map(Number);
                e = o[0] + "和" + o[1] + "( )";
            } else if (83 == t) {
                o = e.split("|").map(Number);
                e = o[0] + "和" + o[1] + "( )( )";
            } else if (84 == t) {
                o = e.split("|").map(Number);
                e = o[0] + "，" + o[1] + "和" + o[2] + "( )";
            } else if (122 == t) {
                o = e.split("|").map(Number);
                e = o[0] + "，" + o[1] + "和" + o[2] + "( )";
            } else if (123 == t) {
                o = e.split("|").map(Number);
                e = o[0] + "，" + o[1] + "和" + o[2] + "( )( )";
            } else if (92 == t) e += "="; else {
                if (93 != t) return a;
                e = (e = e.replace(/\*/g, "×")).replace(/c/g, "÷"), e += "=";
            }
            a[i].timu = e;
        }
        return a;
    },
    preventTouchMove: function() {},
    btnMask: function(t) {
        t.currentTarget.dataset.dialogid;
        this.setData({
            showMask: !1,
            showDownloadDialog: !1,
            showPageSetDialog: !1,
            showTiliangDialog: !1,
            showShushiDialog: !1
        });
    },
    batchSwitchToShushiTimu: function(t) {
        for (var a = [], i = 0; i < t.length; i++) {
            var e = this.switchToShushiTimu(t[i].timu);
            a.push(e);
        }
        return console.log(a), a;
    },
    switchToShushiTimu: function(t) {
        var a = {
            timu_content: "12+34=",
            num1: 12,
            num2: 34,
            operatorValue: "+"
        }, i = this.decodeTimu(t);
        return a.num1 = i[0], a.num2 = i[1], a.operatorValue = i[2], a.timu_content = t, 
        a;
    },
    batchSwitchToFillTimu: function(t, a, i) {
        for (var e = [], o = 0; o < t.length; o++) {
            var s = o % a % i, l = this.switchToFillTimu(t[o].timu, t[o].daan, s);
            e.push(l);
        }
        return e;
    },
    switchToFillTimu: function(t, a, i) {
        var e = "";
        a = this.dealDaan(a);
        var o = [], s = this.getOperatorNum(t) + 1;
        return 2 == s ? (o = this.decodeTimu(t), e = 0 == i ? "( )" + o[2] + o[1] + "=" + a : o[0] + o[2] + "( )=" + a) : 3 == s && (o = this.decodeTimu3(t), 
        e = 0 == i ? "( )" + o[3] + o[1] + o[4] + o[2] + "=" + a : 1 == i ? o[0] + o[3] + "( )" + o[4] + o[2] + "=" + a : o[0] + o[3] + o[1] + o[4] + "( )=" + a), 
        e;
    },
    dealDaan: function(t) {
        return t.includes("|") ? t = (t = t.replace("|0", "")).replace(/\|/g, "······") : t;
    },
    getOperatorNum: function(t) {
        for (var a = 0, i = [ "+", "-", "×", "÷" ], e = 0; e < i.length; e++) a += this.getCharTimes(t, i[e]);
        return a;
    },
    getCharTimes: function(t, a) {
        for (var i = 0, e = 0; e < t.length; e++) t.charAt(e) == a && i++;
        return i;
    },
    getFirstPosition: function(t, a) {
        for (var i = [], e = 0; e < a.length; e++) {
            var o = t.indexOf(a[e]);
            -1 != o && i.push(o);
        }
        return Math.min.apply(Math, i);
    },
    decodeTimu4: function(t) {
        t = t.replace("=", "");
        var a, i, e, o, s, l, n, r = [], d = [ "+", "-", "*", "c" ], u = this.getFirstPosition(t, d);
        a = t.substring(0, u), s = t.substring(u, u + 1);
        var h = this.getFirstPosition(t.substring(u + 1), d);
        h = h + u + 1, i = t.substring(u + 1, h), l = t.substring(h, h + 1);
        var c = this.getFirstPosition(t.substring(h + 1), d);
        return c = c + h + 1, n = t.substring(c, c + 1), e = t.substring(h + 1, c), o = t.substring(c + 1), 
        r[0] = a, r[1] = i, r[2] = e, r[3] = o, r[4] = s, r[5] = l, r[6] = n, console.log("ret=" + r), 
        r;
    },
    decodeTimu3: function(t) {
        t = t.replace("=", "");
        var a, i, e, o, s, l = [], n = [ "+", "-", "×", "÷" ], r = this.getFirstPosition(t, n);
        a = t.substring(0, r), o = t.substring(r, r + 1);
        var d = this.getFirstPosition(t.substring(r + 1), n);
        return d = d + r + 1, i = t.substring(r + 1, d), s = t.substring(d, d + 1), e = t.substring(d + 1), 
        l[0] = a, l[1] = i, l[2] = e, l[3] = o, l[4] = s, console.log("ret=" + l), l;
    },
    decodeTimu: function(t) {
        var a, i, e, o = [], s = 0, l = 0;
        return -1 != (t = t.replace("=", "")).indexOf("+") ? (l = 0, s = t.indexOf("+")) : -1 != t.indexOf("-") ? (l = 1, 
        s = t.indexOf("-")) : -1 != t.indexOf("×") ? (l = 2, s = t.indexOf("×")) : (l = 3, 
        s = t.indexOf("÷")), a = t.substring(0, s), i = t.substring(s + 1), e = [ "+", "-", "×", "÷" ][l], 
        o[0] = a, o[1] = i, o[2] = e, o;
    },
    initCountPicker: function() {
        for (var t = this.data.printCount - 1, a = [], i = 0; i < 500; i++) a.push(i + 1);
        this.setData({
            indexCount: t,
            pickerCountArray: a
        });
    },
    bindPrintStylePickerChange: function(t) {
        var a = parseInt(t.detail.value);
        if (this.data.index != a) {
            console.log("picker发送选择改变，携带值为", t.detail.value), this.setData({
                index: t.detail.value
            });
            var i = 1, e = this.data.array[a];
            "直接写得数" == e ? i = 1 : "填空题" == e ? i = 2 : "竖式列式" == e ? i = 3 : "竖式留白" == e && (i = 4), 
            this.setData({
                printStyleId: i
            }), this.createPrintView(), this.updateTiliangTips();
        }
    },
    bindCountPickerChange: function(t) {
        var a = parseInt(t.detail.value), i = a + 1;
        console.log(a), this.data.indexCount != a && (console.log("picker发送选择改变，携带值为", t.detail.value), 
        this.setData({
            indexCount: t.detail.value,
            printCount: i
        }), this.updateTiliangDialog(), this.data.lastDocId = this.data.docId, this.data.docId = -1, 
        this.loadTimu());
    },
    btnHuanyihuan: function() {
        this.data.lastDocId = this.data.docId, console.log("lastDocId=" + this.data.lastDocId), 
        this.data.docId = -1, this.loadTimu();
    },
    getPageSetting: function() {
        var t = 1, a = this.data.docTitle, i = this.data.nameLabel, e = this.data.scoreLabel, o = this.data.jinju;
        return a != this.data.tiku.xlname && (t = 2), "姓名" != i && (t = 2), "得分" != e && (t = 2), 
        "口算天天练，进步看得见" != o && (t = 2), t;
    },
    downloadDoc: function(t, i) {
        var e = this.data.docId, o = (a.globalData.unionId, this.data.printStyleId), s = this.data.docTitle, l = this.data.nameLabel, n = this.data.scoreLabel, r = this.data.jinju, d = this.getPageSetting();
        1 == d && (s = "", l = "", n = "", r = "");
        var u = "";
        u = 1 == a.globalData.localDebug ? a.globalData.local_url + "downloaddoc?docid=" + e + "&displaydaan=" + t + "&printstyleid=" + o + "&setting=" + d + "&doctitle=" + s + "&namelabel=" + l + "&scorelabel=" + n + "&jinju=" + r : a.globalData.server_bridge + "function=downloaddoc&docid=" + e + "&displaydaan=" + t + "&printstyleid=" + o + "&setting=" + d + "&doctitle=" + s + "&namelabel=" + l + "&scorelabel=" + n + "&jinju=" + r, 
        console.log(u);
        var h = this;
        wx.showLoading({
            title: "加载中"
        }), wx.request({
            url: u,
            method: "GET",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(a) {
                if (console.log(a.data), 0 != a.data.code) {
                    console.log(a.data.data);
                    var e = "https://www.xiaoxuestudy.com/kousuan_v2/pdf/" + a.data.data.filePath, o = h.data.docTitle;
                    1 == t && (o = "答案-" + o), console.log("myfilename=" + o), wx.downloadFile({
                        url: e,
                        filePath: wx.env.USER_DATA_PATH + "/" + o + ".pdf",
                        success: function(t) {
                            var a = t.filePath;
                            1 == i ? wx.shareFileMessage({
                                filePath: a,
                                fileType: "pdf",
                                success: function(t) {
                                    console.log("转发成功", t);
                                },
                                fail: function(t) {
                                    console.log(t), wx.showToast({
                                        icon: "none",
                                        title: "转发失败"
                                    });
                                }
                            }) : 2 == i ? wx.openDocument({
                                filePath: a,
                                fileType: "pdf",
                                showMenu: !0,
                                success: function(t) {
                                    console.log("打开文件成功"), console.log(t);
                                },
                                fail: function(t) {
                                    wx.showToast({
                                        icon: "none",
                                        title: "打开文件失败"
                                    });
                                }
                            }) : 3 == i && wx.setClipboardData({
                                data: e,
                                success: function(t) {
                                    wx.getClipboardData({
                                        success: function(t) {
                                            console.log(t.data);
                                        }
                                    });
                                }
                            });
                        },
                        fail: function(t) {
                            console.log("fail"), console.log(t), wx.showToast({
                                icon: "none",
                                title: "下载失败"
                            });
                        }
                    });
                } else wx.showToast({
                    title: "下载失败",
                    duration: 800
                });
            },
            complete: function(t) {
                wx.hideLoading();
            }
        });
    },
    btnDownloadItem: function(t) {
        var i = t.currentTarget.dataset, e = i.id, o = i.displaydaan, s = i.opentype;
        (this.downloadDoc(o, s), this.setData({
            downloadSelectedId: e
        }), this.updateDownloadDialog(), 2 == e) && (0 != a.globalData.showHongdian && (wx.setStorageSync("showHongdian", 0), 
        a.globalData.showHongdian = 0, this.setData({
            showHongdian: 0
        })));
    },
    btnShowDownloadDialog: function(t) {
        this.updateDownloadDialog(), this.setData({
            showMask: !0,
            showDownloadDialog: !0
        });
    },
    btnShowPageSetDialog: function(t) {
        this.setData({
            showMask: !0,
            showPageSetDialog: !0
        });
    },
    btnShowTiliangDialog: function(t) {
        this.setData({
            showMask: !0,
            showTiliangDialog: !0
        });
    },
    btnShowShushiDialog: function(t) {
        this.setData({
            showMask: !0,
            showShushiDialog: !0
        });
    },
    btnCloseDialog: function(t) {
        var a = t.currentTarget.dataset;
        this.setData({
            showMask: !1
        });
        var i = a.dialogid;
        1 == i && this.setData({
            showDownloadDialog: !1
        }), 2 == i && this.setData({
            showPageSetDialog: !1
        }), 3 == i && this.setData({
            showTiliangDialog: !1
        }), 4 == i && this.setData({
            showShushiDialog: !1
        });
    },
    btnTiliangItem: function(t) {
        var a = t.currentTarget.dataset;
        console.log(a);
        var i = a.id, e = a.byid, o = this.data.printCount, s = 0;
        1 == e ? (s = a.pages + 1, o = this.getRealTimuNum(s)) : 2 == e && 5 != i ? o = a.nums : 2 == e && 5 == i && (o = this.data.printCount), 
        this.data.printCount = o, this.setData({
            tiliangById: e,
            tiliangSelectedId: i,
            printCount: o
        }), this.updateTiliangDialog(), this.data.lastDocId = this.data.docId, this.data.docId = -1, 
        this.loadTimu();
    },
    getRealTimuNum: function(t) {
        var a = this.data.printStyleId, i = 0, e = 0;
        return 1 == a ? (i = this.data.xiedeshu_page1, e = this.data.xiedeshu_page2) : 2 == a ? (i = this.data.fill_page1, 
        e = this.data.fill_page2) : 3 == a ? (i = this.data.lieshi_page1, e = this.data.lieshi_page2) : 4 == a && (i = this.data.liubai_page1, 
        e = this.data.liubai_page2), i + (t - 1) * e;
    },
    getPageNum: function(t) {
        var a = this.data.printStyleId, i = 0, e = 0;
        1 == a ? (i = this.data.xiedeshu_page1, e = this.data.xiedeshu_page2) : 2 == a ? (i = this.data.fill_page1, 
        e = this.data.fill_page2) : 3 == a ? (i = this.data.lieshi_page1, e = this.data.lieshi_page2) : 4 == a && (i = this.data.liubai_page1, 
        e = this.data.liubai_page2);
        var o = (t - i) / e + 1;
        return Math.ceil(o);
    },
    updateTiliangTips: function() {
        var t = this.data.printCount, a = this.getPageNum(t), i = this.data.printStyleId, e = "当前题量选择：" + a + "页" + t + "题，打印方式:" + this.data.array[i - 1];
        this.setData({
            tiliang_tips: e
        });
    },
    updateTiliangDialog: function() {
        this.updateTiliangTips(), this.initCountPicker();
        var t = this.data.printCount, a = this.data.tiliangSelectedId, i = this.data.tiliangById;
        2 == i && (a = 10 == t ? 0 : 20 == t ? 1 : 40 == t ? 2 : 50 == t ? 3 : 100 == t ? 4 : 5, 
        this.data.tiliangSelectedId = a);
        var e = [ "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7" ], o = [ "#000", "#000", "#000", "#000", "#000", "#000" ], s = [ "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7" ], l = [ "#000", "#000", "#000", "#000", "#000", "#000" ], n = this.data.tiliangSelectedId;
        1 == i ? (e[n] = "#e6fbf4", o[n] = "#0bc78a") : (s[n] = "#e6fbf4", l[n] = "#0bc78a"), 
        this.setData({
            bypage_back_color: e,
            bypage_front_color: o,
            bycount_back_color: s,
            bycount_front_color: l
        });
    },
    updateDownloadDialog: function() {
        var t = this.data.downloadSelectedId, a = [ "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7" ], i = [ "#000", "#000", "#000", "#000", "#000", "#000" ];
        -1 != t && (a[t] = "#e6fbf4", i[t] = "#0bc78a"), this.setData({
            download_back_color: a,
            download_front_color: i
        });
    },
    btnOnlineKousuan: function() {
        var t = this.data.tiku, a = this.data.docId;
        console.log("tiku.xlid=" + t.xlid);
        var i = "/pages/timu2/" + t.page + "?tiku=" + encodeURIComponent(JSON.stringify(t)) + "&docid=" + a;
        console.log(i), wx.navigateTo({
            url: i,
            success: function() {}
        });
    },
    getPageSetInput: function(t) {
        var a = t.currentTarget.dataset.id, i = t.detail.value;
        1 == a ? this.setData({
            docTitle: i
        }) : 2 == a ? this.setData({
            nameLabel: i
        }) : 3 == a ? this.setData({
            scoreLabel: i
        }) : 4 == a && this.setData({
            jinju: i
        });
    },
    changeInputBorderColor: function(t) {
        var a = t.currentTarget.dataset.id;
        t.detail.value;
        1 == a ? this.setData({
            input1BorderColor: "#259FD8",
            input2BorderColor: "#bbb",
            input3BorderColor: "#bbb",
            input4BorderColor: "#bbb"
        }) : 2 == a ? this.setData({
            input1BorderColor: "#bbb",
            input2BorderColor: "#259FD8",
            input3BorderColor: "#bbb",
            input4BorderColor: "#bbb"
        }) : 3 == a ? this.setData({
            input1BorderColor: "#bbb",
            input2BorderColor: "#bbb",
            input3BorderColor: "#259FD8",
            input4BorderColor: "#bbb"
        }) : 4 == a && this.setData({
            input1BorderColor: "#bbb",
            input2BorderColor: "#bbb",
            input3BorderColor: "#bbb",
            input4BorderColor: "#259FD8"
        });
    },
    btnResetPage: function(t) {
        var a = t.currentTarget.dataset.id;
        1 == a ? this.setData({
            docTitle: this.data.tiku.xlname
        }) : 2 == a ? this.setData({
            nameLabel: "姓名"
        }) : 3 == a ? this.setData({
            scoreLabel: "得分"
        }) : 4 == a && this.setData({
            jinju: "口算天天练，进步看得见"
        });
    },
    initPrintStylePicker: function(t) {
        for (var a = [ "直接写得数", "填空题", "竖式列式", "竖式留白" ], i = t.split("|"), e = [], o = 0; o < i.length; o++) 1 == parseInt(i[o]) && e.push(a[o]);
        this.setData({
            array: e
        });
    },
    setShushiArr: function(t) {
        for (var a = [ "直接写得数", "填空题", "竖式列式", "竖式留白" ], i = t.split("|"), e = [], o = 0; o < i.length; o++) 1 == parseInt(i[o]) && e.push(a[o]);
        this.setData({
            shushi_title_arr: e
        });
    },
    updateShushiDialog: function() {
        var t = [ "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7" ], a = [ "#000", "#000", "#000", "#000" ], i = this.data.shushiSelectedId;
        a[i] = "#0bc78a", t[i] = "#e6fbf4", this.setData({
            shushi_back_color: t,
            shushi_front_color: a
        });
    },
    btnShushiItem: function(t) {
        for (var a = t.currentTarget.dataset, i = parseInt(a.id), e = 1, o = a.title, s = [ "直接写得数", "填空题", "竖式列式", "竖式留白" ], l = 0; l < 4; l++) if (s[l] == o) {
            e = l + 1;
            break;
        }
        this.setData({
            printStyleId: e,
            shushiSelectedId: i
        }), this.createPrintView(), this.updateShushiDialog(), this.updateTiliangTips();
    },
    btnTitleTips0: function() {
        var t = a.globalData.server_bridge + "function=getarticleurl&id=10101";
        console.log(t), wx.request({
            url: t,
            method: "GET",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(t) {
                console.log(t.data);
                var a = t.data.data;
                wx.navigateTo({
                    url: "/pages/article/article?url=" + a
                });
            }
        });
    },
    btnTitleTips: function() {
        wx.navigateTo({
            url: "/pages/article/article?url=https://mp.weixin.qq.com/s/UBYe_a6wnDpzU-XJZrSoLg"
        });
    },
    onShareAppMessage: function(t) {
        var i = {};
        i.tiku = this.data.tiku, i.printcount = this.data.printCount, i.docid = this.data.docId, 
        i.byid = 2, i.pagenum = -1;
        var e = JSON.stringify(i);
        console.log(e), t.from;
        var o = a.globalData.server_bridge + "function=setdocflag&docid=" + this.data.docId + "&flag=2";
        return wx.request({
            url: o,
            method: "GET",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(t) {}
        }), {
            title: "你有一个口算练习待完成",
            path: "/pages/share/share?params=" + e
        };
    }
});