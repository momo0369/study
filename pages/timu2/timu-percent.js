var t = getApp();

Page({
    data: {
        tiku: {},
        docId: -1,
        id1: 1,
        id2: 2,
        id3: 3,
        id4: 4,
        id5: 5,
        id6: 6,
        id7: 7,
        id8: 8,
        id9: 9,
        id0: 0,
        percentSign: "",
        showpercent: "",
        manyInput: 0,
        dootSign: "...",
        answerBelow: !0,
        idshare: "share",
        idcls: "delete",
        iddraw: "draw",
        idanswer: "answer",
        pen: 3,
        color: "#cc0033",
        view_class: "hide",
        stageHidden: "hide",
        IsOnTuya: 0,
        inputRightFlagHidden: "hide",
        inputWrongFlagHidden: "hide",
        fenzi: "122",
        ctx: null,
        btnHeight: 1,
        navigateBarTitle: "",
        timuObj: null,
        currentIndex: 0,
        progressid: "progress0",
        totalTimuNum: 10,
        totalRight: 0,
        isHelped: !1,
        wrongTimuSet: [],
        currentTimuObj: {
            timu: "",
            daan: ""
        },
        candidateAnswer: "",
        timusize: 24,
        timufamily: "",
        daansize: 24,
        daanfamily: "",
        stage: "normal",
        timuInfo: {},
        timeFirstIn: new Date().valueOf()
    },
    startX: 0,
    startY: 0,
    isClear: !1,
    onLoad: function(e) {
        this.data.timeFirstIn = new Date().valueOf();
        var a = JSON.parse(decodeURIComponent(e.tiku));
        this.data.tiku = a;
        var i = e.docid;
        this.data.docId = e.docid;
        var n = this;
        wx.setNavigationBarTitle({
            title: a.xlname
        });
        var s = .7 * ((wx.getSystemInfoSync().windowWidth - 10) / 4), o = this.data.currentTimuObj, d = this.data.timufamily, r = this.data.timusize, c = this.data.daansize, u = this.data.daanfamily;
        null != a.timufamily && "" != a.timufamily && (d = a.timufamily), null != a.timusize && "" != a.timusize && (r = a.timusize), 
        null != a.daanfamily && "" != a.daanfamily && (u = a.daanfamily), null != a.daansize && "" != a.daansize && (c = a.daansize);
        var l = {
            timuInfo: a,
            btnHeight: s,
            currentTimuObj: o,
            timusize: r,
            timufamily: d,
            daansize: c,
            daanfamily: u
        };
        this.setData(l), 7 == a.dlid && 90 == a.xlid && this.setData({
            percentSign: "%",
            showpercent: "%"
        });
        var h = a.xlid, g = (t.globalData.unionId, "");
        -1 == i ? g = 1 == t.globalData.localDebug ? t.globalData.local_url + "createdoc?xlid=" + a.xlid + "&totalcount=10" : t.globalData.server_bridge + "function=createdoc&xlid=" + a.xlid + "&totalcount=10" : (i = e.docid, 
        g = 1 == t.globalData.localDebug ? t.globalData.local_url + "getdoc?docid=" + i : t.globalData.server_bridge + "function=getdoc&docid=" + i), 
        wx.showLoading({
            title: "加载中"
        }), console.log(g), wx.request({
            url: g,
            method: "GET",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(e) {
                console.log(e.data);
                var i = e.data.data.timus;
                i.length > 10 && i.splice(10), console.log(i), i = t.setTimuStyle(h, i, a.page), 
                n.setData({
                    timuObj: i,
                    totalTimuNum: i.length,
                    docId: e.data.data.docId
                }), n.loadTimu();
            },
            complete: function(t) {
                wx.hideLoading();
            }
        }), wx.hideTabBar({}), this.innerAudioContext = wx.createInnerAudioContext(), this.innerAudioContext2 = wx.createInnerAudioContext();
    },
    btnFeedback: function() {
        var e = this.data.timuObj[this.data.currentIndex].timu;
        t.globalData.timu_feedback = e;
        wx.navigateTo({
            url: "/pages/feedback/feedback"
        });
    },
    parseNumber: function(t, e) {
        var a = t.trim();
        return 0 == a.indexOf("(") && (e.pre = "(", a = a.substring(1)), a.indexOf(")") > 0 && (e.tail = ")", 
        a = a.substring(0, a.length - 1)), isNaN(a), a;
    },
    loadTimu: function() {
        var e = this.data.timuObj[this.data.currentIndex], a = e.timu, i = a.indexOf("=");
        -1 == i && (i = a.length);
        var n = a.substring(0, i), s = t.buildFenshuExpre(n);
        this.setData({
            percentSign: this.data.showpercent,
            progressid: "progress" + this.data.totalRight
        });
        var o = {
            timu: e.timu,
            daan: e.daan,
            realAnswer: e.realAnswer
        };
        this.setData({
            currentTimuObj: o,
            nums: s
        });
    },
    loadTimu4Wrong: function() {
        if (console.log("错题的内容：" + this.data.wrongTimuSet), 0 != this.data.wrongTimuSet.length) {
            var t = this.data.wrongTimuSet.pop();
            console.log("timu=" + JSON.stringify(t)), t.daan.indexOf("|") > 0 ? this.setData({
                manyInput: 1
            }) : this.setData({
                manyInput: 0
            }), this.setData({
                percentSign: this.data.showpercent,
                progressid: "progress" + this.data.totalRight
            });
            var e = {
                timu: t.timu,
                daan: t.daan
            };
            console.log("obj的值：" + JSON.stringify(e)), this.setData({
                currentTimuObj: e
            });
        }
    },
    mathAnswerEqual: function(t, e) {
        if (console.log("calAnswer=" + t + ",rightAnswer=" + e), e.indexOf("|") > 0) return e == t.replace(this.data.dootSign, "|");
        var a = Math.abs(t - e);
        return console.log(t + " -" + e + " - " + a), a < .001;
    },
    checkAnswer: function(t) {
        var e = this.data.candidateAnswer, a = 1e3;
        if (this.mathAnswerEqual(e, this.data.currentTimuObj.daan.replace("%", ""))) {
            (this.data.totalTimuNum != this.data.currentIndex + 1 || this.data.wrongTimuSet.length > 0) && this.playAudio2("success");
            var i = this;
            void 0 !== t && 0 == t || (a = 200), setTimeout(function() {
                if (0 == t ? i.setData({
                    percentSign: "",
                    inputRightFlagHidden: "hide",
                    candidateAnswer: ""
                }) : i.setData({
                    percentSign: "",
                    inputRightFlagHidden: "visiable",
                    candidateAnswer: ""
                }), i.data.totalTimuNum == i.data.currentIndex + 1) {
                    if (i.data.wrongTimuSet.length > 0) return i.data.stage = "fix", i.setData({
                        percentSign: i.data.percentSign,
                        stageHidden: "visiable",
                        inputRightFlagHidden: "hide",
                        candidateAnswer: "",
                        currentIndex: ++i.data.currentIndex,
                        totalRight: ++i.data.totalRight
                    }), console.log("flag1"), void i.loadTimu4Wrong();
                    if (i.data.isHelped) wx.redirectTo({
                        url: "score_fail?params=" + JSON.stringify(i.data.timuInfo) + "&tiku=" + encodeURIComponent(JSON.stringify(i.data.tiku)),
                        success: function() {
                            console.log("jump to failed page");
                        }
                    }); else {
                        var e = new Date().valueOf() - i.data.timeFirstIn;
                        i.data.timuInfo.timecost = e;
                        var a = i.data.tiku, n = "/pages/timu2/score_win?tiku=" + encodeURIComponent(JSON.stringify(a)) + "&timecost=" + e + "&wrongnums=0";
                        console.log("url=" + n), wx.redirectTo({
                            url: n,
                            success: function() {
                                console.log("jump to win page");
                            }
                        });
                    }
                    var s = "https://www.xiaoxuestudy.com/kousuan_v2/bridge.php?function=deletedocbyid&docid=" + i.data.docId;
                    return console.log("url=" + s), void wx.request({
                        url: s,
                        method: "GET",
                        header: {
                            "Content-Type": "application/json;charset=UTF-8"
                        },
                        success: function(t) {}
                    });
                }
                setTimeout(function() {
                    i.setData({
                        percentSign: i.data.percentSign,
                        inputRightFlagHidden: "hide",
                        candidateAnswer: "",
                        currentIndex: ++i.data.currentIndex,
                        totalRight: ++i.data.totalRight
                    }), i.loadTimu();
                }, 500);
            }, a);
        }
    },
    checkAnswer4FixStage: function(t) {
        var e = this.data.candidateAnswer, a = 400;
        if (this.mathAnswerEqual(e, this.data.currentTimuObj.daan.replace("%", ""))) {
            var i = this;
            void 0 !== t && 0 == t || (a = 200), setTimeout(function() {
                if (0 == t ? i.setData({
                    inputRightFlagHidden: "hidden",
                    candidateAnswer: ""
                }) : i.setData({
                    inputRightFlagHidden: "visiable",
                    candidateAnswer: ""
                }), 0 != i.data.wrongTimuSet.length) setTimeout(function() {
                    i.setData({
                        stageHidden: "visiable",
                        inputRightFlagHidden: "hide",
                        candidateAnswer: "",
                        totalRight: ++i.data.totalRight
                    }), console.log("flag3"), i.loadTimu4Wrong();
                }, 200); else if (i.data.isHelped) wx.navigateTo({
                    url: "score_fail?params=" + JSON.stringify(i.data.timuInfo),
                    success: function() {
                        console.log("jump to failed page");
                    }
                }); else {
                    var e = new Date().valueOf() - i.data.timeFirstIn;
                    i.data.timuInfo.timecost = e, wx.navigateTo({
                        url: "score_win?params=" + JSON.stringify(i.data.timuInfo),
                        success: function() {
                            console.log("jump to win page");
                        }
                    });
                }
            }, a);
        }
    },
    getAnswerLength: function(t) {
        return (t + "").length;
    },
    playAudio: function(t) {
        var e = "/pages/resource/" + t + ".mp3";
        this.innerAudioContext.src = e, this.innerAudioContext.play();
    },
    playAudio2: function(t) {
        var e = "/pages/resource/" + t + ".mp3";
        this.innerAudioContext2.src = e, this.innerAudioContext2.play();
    },
    btnNum: function(t) {
        this.playAudio("click");
        var e = t.target.dataset.id, a = this.data.candidateAnswer + e;
        this.setData({
            candidateAnswer: a
        }), "fix" == this.data.stage ? this.checkAnswer4FixStage() : this.checkAnswer();
    },
    btnManyinput: function(t) {
        var e = this.data.candidateAnswer;
        "" == e || e.indexOf("...") > 0 || (e += this.data.dootSign, this.setData({
            candidateAnswer: e
        }), "fix" == this.data.stage ? this.checkAnswer4FixStage() : this.checkAnswer());
    },
    btnDot: function() {
        this.playAudio("click");
        var t = this.data.candidateAnswer;
        t.indexOf(".") >= 0 || this.setData({
            candidateAnswer: t + "."
        });
    },
    btnClear: function() {
        var t = this.data.candidateAnswer, e = t.length;
        0 != e && (t = t.indexOf(this.data.dootSign) > 0 && t.indexOf(this.data.dootSign) == t.length - this.data.dootSign.length ? t.substring(0, e - this.data.dootSign.length) : t.substring(0, e - 1), 
        this.setData({
            candidateAnswer: t
        }), this.playAudio("delete"));
    },
    btnTuya: function() {
        this.setData({
            IsOnTuya: 1
        }), this.setData({
            view_class: "show"
        });
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
            candidateAnswer: t.daan.replace("%", "")
        }), this.setData({
            isHelped: !0
        }), "fix" == this.data.stage ? this.checkAnswer4FixStage(!1) : this.checkAnswer(!1);
    },
    selectedA: function(t) {
        console.log(t.currentTarget.dataset.fenzi), this.setData({
            fenzi: "|"
        });
        var e = this;
        setInterval(function() {
            e.setData({
                fenzi: ""
            });
        }, 500), setInterval(function() {
            e.setData({
                fenzi: "|"
            });
        }, 500);
    },
    touchStart: function(t) {
        this.startX = t.changedTouches[0].x, this.startY = t.changedTouches[0].y, this.context = wx.createContext(), 
        this.setData({
            ctx: this.context
        }), this.isClear ? (this.context.setStrokeStyle("#FFFFFF"), this.context.setLineCap("round"), 
        this.context.setLineJoin("round"), this.context.setLineWidth(20), this.context.save(), 
        this.context.beginPath(), this.context.arc(this.startX, this.startY, 5, 0, 2 * Math.PI, !0), 
        this.context.fill(), this.context.restore()) : (this.context.setStrokeStyle(this.data.color), 
        this.context.setLineWidth(this.data.pen), this.context.setLineCap("round"), this.context.beginPath());
    },
    touchMove: function(t) {
        var e = t.changedTouches[0].x, a = t.changedTouches[0].y;
        this.isClear ? (this.context.save(), this.context.moveTo(this.startX, this.startY), 
        this.context.lineTo(e, a), this.context.stroke(), this.context.restore(), this.startX = e, 
        this.startY = a) : (this.context.moveTo(this.startX, this.startY), this.context.lineTo(e, a), 
        this.context.stroke(), this.startX = e, this.startY = a), wx.drawCanvas({
            canvasId: "myCanvas",
            reserve: !0,
            actions: this.context.getActions()
        });
    },
    touchEnd: function() {},
    clearCanvas: function() {
        var t = wx.getSystemInfoSync().screenWidth, e = wx.getSystemInfoSync().screenHeight;
        this.context.clearRect(0, 0, t, e), wx.drawCanvas({
            canvasId: "myCanvas",
            reserve: !0,
            actions: this.context.getActions()
        });
    },
    closeCanvas: function() {
        var t = wx.getSystemInfoSync().screenWidth, e = wx.getSystemInfoSync().screenHeight;
        this.context.clearRect(0, 0, t, e), wx.drawCanvas({
            canvasId: "myCanvas",
            reserve: !0,
            actions: this.context.getActions()
        }), this.setData({
            view_class: "hide"
        }), this.setData({
            IsOnTuya: 0
        });
    },
    onPullDownRefresh: function() {
        wx.stopPullDownRefresh();
    },
    btnPrintview: function() {
        var t = this.data.tiku, e = this.data.docId, a = "/pages/printview/printview?tiku=" + encodeURIComponent(JSON.stringify(t)) + "&docid=" + e + "&printcount=" + "-1&byid=2&pagenum=" + -1;
        console.log(a), wx.navigateTo({
            url: a
        });
    },
    preventTouchMove: function() {},
    onShareAppMessage: function() {
        var t = this.data.tiku, e = t.page;
        return {
            title: "待完成：" + t.xlname,
            path: "/pages/timu2/" + e + "?tiku=" + encodeURIComponent(JSON.stringify(t)) + "&docid=" + -1
        };
    },
    nouse: function() {}
});