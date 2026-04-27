var t, e = require("../../@babel/runtime/helpers/defineProperty"), a = getApp();

Page({
    data: (t = {
        idanswer: "answer",
        view_class: "hide",
        stageHidden: "hide",
        btnHeight: 1,
        btnWidth: 1,
        navigateBarTitle: "",
        timuObj: null,
        currentIndex: 0,
        progressid: "progress0"
    }, e(t, "stageHidden", "hide"), e(t, "inputRightFlagHidden", "hide"), e(t, "inputWrongFlagHidden", "hide"), 
    e(t, "totalTimuNum", 10), e(t, "totalRight", 0), e(t, "isHelped", !1), e(t, "wrongTimuSet", []), 
    e(t, "currentTimuObj", {
        timu: "",
        daan: ""
    }), e(t, "candidateAnswer", ""), e(t, "candidateUserAnswer", ""), e(t, "timusize", 24), 
    e(t, "timufamily", ""), e(t, "daansize", 24), e(t, "daanfamily", ""), e(t, "stage", "normal"), 
    e(t, "timuInfo", {}), e(t, "timeFirstIn", new Date().valueOf()), t),
    startX: 0,
    startY: 0,
    isClear: !1,
    onLoad: function(t) {
        this.data.timeFirstIn = new Date().valueOf();
        var e = JSON.parse(t.params);
        console.log(e);
        var i = this;
        wx.setNavigationBarTitle({
            title: e.title
        });
        var n = (wx.getSystemInfoSync().windowWidth - 10) / 4, s = .7 * n, r = this.data.currentTimuObj, d = this.data.timufamily, u = this.data.timusize, l = this.data.daansize, o = this.data.daanfamily;
        null != e.timufamily && "" != e.timufamily && (d = e.timufamily), null != e.timusize && "" != e.timusize && (u = e.timusize), 
        null != e.daanfamily && "" != e.daanfamily && (o = e.daanfamily), null != e.daansize && "" != e.daansize && (l = e.daansize);
        var h = {
            timuInfo: e,
            btnWidth: n,
            btnHeight: s,
            currentTimuObj: r,
            timusize: u,
            timufamily: d,
            daansize: l,
            daanfamily: o
        };
        this.setData(h);
        var g = a.globalData.server_url + "/timuapi.php";
        g += "?dlid=" + e.dlid + "&xlid=" + e.xlid + "&page=" + e.page + "&manual=" + e.manual, 
        wx.request({
            url: g,
            method: "POST",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(t) {
                console.log(t), i.setData({
                    timuObj: t.data,
                    totalTimuNum: t.data.length
                }), i.loadTimu();
            }
        });
        g = a.globalData.server_url + "/getdanweiapi.php?dlid=" + (e.xlid - 102);
        wx.request({
            url: g,
            method: "POST",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(t) {
                i.setData({
                    danweis: t.data
                });
            }
        }), wx.hideTabBar({});
    },
    parseNumber: function(t, e) {
        var a = t;
        return 0 == a.indexOf("(") && (e.pre = "(", a = a.substring(1)), a.indexOf(")") > 0 && (e.tail = ")", 
        a = a.substring(0, a.length - 1)), isNaN(a), a;
    },
    buildFenshuExpre: function(t) {
        for (var e = t, a = -1, i = 1, n = [], s = ""; a++ < e.length; ) {
            var r = e.charAt(a);
            if ("C" == r ? r = "÷" : "*" == r && (r = "×"), "+" == r || "-" == r || "×" == r || "÷" == r) {
                if (n[u = ++i - 2] = {}, (l = n[u]).exp = s, (o = s.split("U")).length > 1) {
                    l.fenshu = 1, l.int = this.parseNumber(o[0], l);
                    var d = o[1].split("/");
                    l.fenzi = this.parseNumber(d[0], l), l.fenmu = this.parseNumber(d[1], l);
                } else {
                    if (-1 == s.indexOf("/")) l.fenshu = -1, l.int = this.parseNumber(s, l); else {
                        l.fenshu = 1, l.int = -1;
                        d = s.split("/");
                        l.fenzi = this.parseNumber(d[0], l), l.fenmu = this.parseNumber(d[1], l);
                    }
                }
                l.sign = r, s = "";
            } else s += r;
        }
        var u, l, o;
        if (n[u = i - 1] = {}, (l = n[u]).exp = s, (o = s.split("U")).length > 1) {
            l.fenshu = 1, l.int = this.parseNumber(o[0], l);
            d = o[1].split("/");
            l.fenzi = this.parseNumber(d[0], l), l.fenmu = this.parseNumber(d[1], l);
        } else {
            if (-1 == s.indexOf("/")) l.fenshu = -1, l.int = this.parseNumber(s, l); else {
                l.fenshu = 1, l.int = -1;
                d = s.split("/");
                l.fenzi = this.parseNumber(d[0], l), l.fenmu = this.parseNumber(d[1], l);
            }
        }
        return l.sign = r, n;
    },
    loadTimu: function() {
        var t = this.data.timuObj[this.data.currentIndex], e = t.timu;
        console.log(e);
        var a = e.indexOf("O"), i = e.substring(0, a), n = e.substring(a + 1, e.length), s = this.buildFenshuExpre(i), r = this.buildFenshuExpre(n);
        this.setData({
            progressid: "progress" + this.data.totalRight
        });
        var d = {
            timu: t.timu,
            daan: t.answer,
            realAnswer: t.realAnswer
        };
        this.setData({
            currentTimuObj: d,
            nums_left: s,
            nums_right: r
        });
    },
    loadTimu4Wrong: function() {
        if (0 != this.data.wrongTimuSet.length) {
            var t = this.data.wrongTimuSet.pop(), e = t.timu, a = e.indexOf("O"), i = e.substring(0, a), n = e.substring(a + 1, e.length), s = this.buildFenshuExpre(i), r = this.buildFenshuExpre(n);
            this.setData({
                progressid: "progress" + this.data.totalRight
            });
            var d = {
                timu: t.timu,
                daan: t.answer,
                realAnswer: t.realAnswer
            };
            this.setData({
                currentTimuObj: d,
                nums_left: s,
                nums_right: r
            });
        }
    },
    checkAnswer: function(t) {
        var e = 1e3;
        if (this.data.candidateUserAnswer == this.data.currentTimuObj.daan) {
            var a = this;
            void 0 !== t && 0 == t || (e = 200), setTimeout(function() {
                if (0 == t ? a.setData({
                    inputRightFlagHidden: "hide",
                    candidateAnswer: ""
                }) : a.setData({
                    inputRightFlagHidden: "visiable",
                    candidateAnswer: ""
                }), a.data.totalTimuNum != a.data.currentIndex + 1) setTimeout(function() {
                    a.setData({
                        inputRightFlagHidden: "hide",
                        candidateAnswer: "",
                        currentIndex: ++a.data.currentIndex,
                        totalRight: ++a.data.totalRight
                    }), a.loadTimu();
                }, 500); else {
                    if (a.data.wrongTimuSet.length > 0) return a.data.stage = "fix", a.setData({
                        stageHidden: "visiable",
                        inputRightFlagHidden: "hide",
                        candidateAnswer: "",
                        currentIndex: ++a.data.currentIndex,
                        totalRight: ++a.data.totalRight
                    }), void a.loadTimu4Wrong();
                    if (a.data.isHelped) wx.navigateTo({
                        url: "score_fail?params=" + JSON.stringify(a.data.timuInfo),
                        success: function() {
                            console.log("jump to failed page");
                        }
                    }); else {
                        var e = new Date().valueOf() - a.data.timeFirstIn;
                        a.data.timuInfo.timecost = e, wx.navigateTo({
                            url: "score_win?params=" + JSON.stringify(a.data.timuInfo),
                            success: function() {
                                console.log("jump to win page");
                            }
                        });
                    }
                }
            }, e);
        } else {
            a = this;
            this.setData({
                candidateAnswer: "",
                inputWrongFlagHidden: "visiable"
            }), this.data.wrongTimuSet.push(this.data.timuObj[this.data.currentIndex]), setTimeout(function() {
                if (a.data.totalTimuNum == a.data.currentIndex + 1) return a.data.stage = "fix", 
                a.setData({
                    stageHidden: "visiable",
                    inputWrongFlagHidden: "hide",
                    candidateAnswer: ""
                }), void a.loadTimu4Wrong();
                a.setData({
                    inputWrongFlagHidden: "hide",
                    candidateAnswer: "",
                    currentIndex: ++a.data.currentIndex
                }), a.loadTimu();
            }, 500);
        }
    },
    checkAnswer4FixStage: function(t) {
        var e = 1e3;
        if (this.data.candidateUserAnswer == this.data.currentTimuObj.daan) {
            var a = this;
            void 0 !== t && 0 == t || (e = 200), setTimeout(function() {
                if (0 == t ? a.setData({
                    inputRightFlagHidden: "hidden",
                    candidateAnswer: ""
                }) : a.setData({
                    inputRightFlagHidden: "visiable",
                    candidateAnswer: ""
                }), 0 != a.data.wrongTimuSet.length) setTimeout(function() {
                    a.setData({
                        stageHidden: "visiable",
                        inputRightFlagHidden: "hide",
                        candidateAnswer: "",
                        totalRight: ++a.data.totalRight
                    }), a.loadTimu4Wrong();
                }, 200); else if (a.data.isHelped) wx.navigateTo({
                    url: "score_fail?params=" + JSON.stringify(a.data.timuInfo),
                    success: function() {
                        console.log("jump to failed page");
                    }
                }); else {
                    var e = new Date().valueOf() - a.data.timeFirstIn;
                    a.data.timuInfo.timecost = e, wx.navigateTo({
                        url: "?params=" + JSON.stringify(a.data.timuInfo),
                        success: function() {
                            console.log("jump to win page");
                        }
                    });
                }
            }, e);
        } else {
            a = this;
            this.setData({
                inputWrongFlagHidden: "visiable"
            }), setTimeout(function() {
                a.setData({
                    stageHidden: "visiable",
                    inputWrongFlagHidden: "hide",
                    candidateAnswer: ""
                });
            }, 500);
        }
    },
    btnBtn: function(t) {
        var e = t.target.dataset, a = e.disp;
        this.setData({
            candidateAnswer: a,
            candidateUserAnswer: e.id
        }), "fix" == this.data.stage ? this.checkAnswer4FixStage() : this.checkAnswer();
    },
    btnShare: function() {
        return {
            title: "口算天天练",
            desc: "口算天天练，进步看得见",
            path: "/page/index/index"
        };
    },
    btnAnswer: function() {
        var t = this.data.currentTimuObj;
        t.viewdaan = 1, this.setData({
            candidateAnswer: t.daan,
            candidateUserAnswer: t.daan
        }), this.setData({
            isHelped: !0
        }), "fix" == this.data.stage ? this.checkAnswer4FixStage(!1) : this.checkAnswer(!1);
    },
    onPullDownRefresh: function() {
        wx.stopPullDownRefresh();
    },
    onShareAppMessage: function() {
        return {
            title: "口算天天练，进步看得见！",
            imageUrl: "/img/share.jpg",
            desc: "口算天天练，进步看得见！",
            path: "/pages/index/index"
        };
    }
});