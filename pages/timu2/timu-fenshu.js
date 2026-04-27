var t = require("../../@babel/runtime/helpers/typeof"), e = require("../../@babel/runtime/helpers/defineProperty"), a = getApp();

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
        currentAnswerObj: {},
        currentTimuObj: {},
        currentTimuTemplateName: "fenshu",
        candidateAnswer: "",
        timusize: 24,
        timufamily: "",
        daansize: 24,
        daanfamily: "",
        stage: "normal",
        timuInfo: {},
        printinfo: {},
        timeFirstIn: new Date().valueOf(),
        showJQ: 0,
        JQlink: ""
    },
    startX: 0,
    startY: 0,
    isClear: !1,
    onLoad: function(t) {
        this.data.timeFirstIn = new Date().valueOf();
        var e = JSON.parse(decodeURIComponent(t.tiku));
        this.data.tiku = e;
        var n = t.docid;
        this.data.docId = t.docid;
        var i = this;
        wx.setNavigationBarTitle({
            title: e.xlname
        });
        var s = .7 * ((wx.getSystemInfoSync().windowWidth - 10) / 4), r = this.data.currentTimuObj, u = this.data.timufamily, o = this.data.timusize, d = this.data.daansize, c = this.data.daanfamily;
        null != e.timufamily && "" != e.timufamily && (u = e.timufamily), null != e.timusize && "" != e.timusize && (o = e.timusize), 
        null != e.daanfamily && "" != e.daanfamily && (c = e.daanfamily), null != e.daansize && "" != e.daansize && (d = e.daansize);
        var l = {
            timuInfo: e,
            btnHeight: s,
            currentTimuObj: r,
            timusize: o,
            timufamily: u,
            daansize: d,
            daanfamily: c
        };
        this.setData(l), e.jiqiao && "" != e.jiqiao && this.setData({
            showJQ: 1,
            JQlink: e.jiqiao
        });
        var h = e.xlid, m = (a.globalData.unionId, "");
        -1 == n ? m = 1 == a.globalData.localDebug ? a.globalData.local_url + "createdoc?xlid=" + e.xlid + "&totalcount=10" : a.globalData.server_bridge + "function=createdoc&xlid=" + e.xlid + "&totalcount=10" : (n = t.docid, 
        m = 1 == a.globalData.localDebug ? a.globalData.local_url + "getdoc?docid=" + n : a.globalData.server_bridge + "function=getdoc&docid=" + n), 
        console.log(m), wx.showLoading({
            title: "加载中"
        }), wx.request({
            url: m,
            method: "GET",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(t) {
                console.log(t.data.data);
                var n = t.data.data.timus;
                n.length > 10 && n.splice(10), console.log(n), n = a.setTimuStyle(h, n, e.page), 
                i.setData({
                    timuObj: n,
                    totalTimuNum: n.length,
                    docId: t.data.data.docId
                }), i.loadTimu();
            },
            complete: function(t) {
                wx.hideLoading();
            }
        }), wx.hideTabBar({}), this.innerAudioContext = wx.createInnerAudioContext(), this.innerAudioContext2 = wx.createInnerAudioContext();
    },
    loadTimu: function() {
        var t = this.data.timuObj[this.data.currentIndex];
        this.setData({
            progressid: "progress" + this.data.totalRight
        });
        var e = t.timu, n = a.buildFenshuExpre(e), i = {
            FenshuSelection: "sint",
            sfenzi: "",
            sfenmu: "",
            calNums: n.length,
            nums: n,
            sint: ""
        };
        i.daan = t.daan, console.log("obj=" + JSON.stringify(i));
        var s = this.data.currentAnswerObj, r = t.daan.split("u"), u = {};
        if (u.exp = t.daan, s.num0 = u, s.istips = 1, s.viewdaan = 0, i.answerFenshu = 1, 
        r.length > 1) {
            s.answerFenshu = 1, s.answerInt = this.parseNumber(r[0], s);
            var o = r[1].split("/");
            s.answerFenzi = this.parseNumber(o[0], s), s.answerFenmu = this.parseNumber(o[1], s);
        } else {
            if (-1 == u.exp.indexOf("/")) s.answerFenshu = -1, i.answerFenshu = -1, s.answerInt = this.parseNumber(u.exp, s); else {
                s.answerFenshu = 1, s.answerInt = -1;
                o = u.exp.split("/");
                s.answerFenzi = this.parseNumber(o[0], s), s.answerFenmu = this.parseNumber(o[1], s);
            }
        }
        i.answerInt = 0, (t.daan.indexOf("U") > 0 || s.answerInt > 0) && (i.answerInt = 1), 
        i.answerInt <= 0 && (i.FenshuSelection = "sfenzi"), n.length > 1 || 1 == s.answerFenshu ? (i.needInput = 1, 
        this.setData({
            answerBelow: !1
        })) : (i.needInput = 0, this.setData({
            answerBelow: !0
        })), i.realAnswer = this.str2float(t.daan), s.realAnswer = i.realAnswer, this.setData({
            candidateAnswer: "",
            currentTimuObj: i,
            currentAnswerObj: s
        }), console.log("currentTimuObj=" + JSON.stringify(this.data.currentTimuObj));
    },
    loadTimu4Wrong: function() {
        if (0 != this.data.wrongTimuSet.length) {
            this.data.wrongTimuSet.pop();
            this.setData({
                progressid: "progress" + this.data.totalRight
            });
        }
    },
    parseNumber: function(t, e) {
        var a = t.trim();
        return 0 == a.indexOf("(") && (e.pre = "(", a = a.substring(1)), a.indexOf(")") > 0 && (e.tail = ")", 
        a = a.substring(0, a.length - 1)), isNaN(a), a;
    },
    selectedFenzi: function() {
        var t = this.data.currentTimuObj;
        t.FenshuSelection = "sfenzi", this.setData({
            currentTimuObj: t
        });
    },
    selectedFenmu: function() {
        var t = this.data.currentTimuObj;
        t.FenshuSelection = "sfenmu", this.setData({
            currentTimuObj: t
        });
    },
    selectedInt: function() {
        var t = this.data.currentTimuObj;
        t.FenshuSelection = "sint", this.setData({
            currentTimuObj: t
        });
    },
    mathAnswerEqual: function(t, e) {
        console.log("calAnswer=" + t + ",rightAnswer=" + e);
        var a = Math.abs(t - e);
        return console.log(t + " -" + e + " - " + a), a < .001;
    },
    checkAnswer: function(t) {
        var a = this.data.candidateAnswer, n = 500;
        if (console.log("currentTimuObj.daan=" + this.data.currentTimuObj.realAnswer), this.mathAnswerEqual(a, this.data.currentTimuObj.realAnswer)) {
            (this.data.totalTimuNum != this.data.currentIndex + 1 || this.data.wrongTimuSet.length > 0) && this.playAudio2("success");
            var i = this;
            void 0 !== t && 0 == t || (n = 200), setTimeout(function() {
                var a = i.data.currentAnswerObj;
                if (a.candidate = "", 0 == t ? i.setData({
                    inputRightFlagHidden: "hide",
                    currentAnswerObj: a,
                    candidateAnswer: ""
                }) : i.setData({
                    inputRightFlagHidden: "visiable",
                    currentAnswerObj: a,
                    candidateAnswer: ""
                }), i.data.totalTimuNum == i.data.currentIndex + 1) {
                    var n;
                    if (i.data.wrongTimuSet.length > 0) return i.data.stage = "fix", i.setData((e(n = {
                        candidateAnswer: "",
                        currentAnswerObj: a,
                        stageHidden: "visiable",
                        inputRightFlagHidden: "hide"
                    }, "candidateAnswer", ""), e(n, "currentIndex", ++i.data.currentIndex), e(n, "totalRight", ++i.data.totalRight), 
                    n)), void i.loadTimu4Wrong();
                    if (i.data.isHelped) wx.redirectTo({
                        url: "score_fail?params=" + JSON.stringify(i.data.timuInfo) + "&tiku=" + encodeURIComponent(JSON.stringify(i.data.tiku)),
                        success: function() {
                            console.log("jump to failed page");
                        }
                    }); else {
                        var s = new Date().valueOf() - i.data.timeFirstIn;
                        i.data.timuInfo.timecost = s;
                        var r = i.data.tiku, u = "/pages/timu2/score_win?tiku=" + encodeURIComponent(JSON.stringify(r)) + "&timecost=" + s + "&wrongnums=0";
                        console.log("url=" + u), wx.redirectTo({
                            url: u,
                            success: function() {
                                console.log("jump to win page");
                            }
                        });
                    }
                    var o = "https://www.xiaoxuestudy.com/kousuan_v2/bridge.php?function=deletedocbyid&docid=" + i.data.docId;
                    return console.log("url=" + o), void wx.request({
                        url: o,
                        method: "GET",
                        header: {
                            "Content-Type": "application/json;charset=UTF-8"
                        },
                        success: function(t) {}
                    });
                }
                setTimeout(function() {
                    var t;
                    i.setData((e(t = {
                        candidateAnswer: "",
                        currentAnswerObj: a,
                        inputRightFlagHidden: "hide"
                    }, "candidateAnswer", ""), e(t, "currentIndex", ++i.data.currentIndex), e(t, "totalRight", ++i.data.totalRight), 
                    t)), i.loadTimu();
                }, 500);
            }, n);
        }
    },
    checkAnswer4FixStage: function(t) {
        console.log("9530");
        var e = 400;
        if (this.data.candidateAnswer == this.data.currentTimuObj.daan) {
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
                }, 500); else if (a.data.isHelped) wx.navigateTo({
                    url: "score_fail?params=" + JSON.stringify(a.data.timuInfo),
                    success: function() {
                        console.log("jump to failed page");
                    }
                }); else {
                    var e = new Date().valueOf() - a.data.timeFirstIn;
                    a.data.timuInfo.timecost = e;
                    var n = a.data.tiku;
                    console.log("准备从这里跳转");
                    var i = "/pages/timu2/score_win?tiku=" + encodeURIComponent(JSON.stringify(n)) + "&timecost=" + e + "&wrongnums=0";
                    wx.navigateTo({
                        url: i,
                        success: function() {
                            console.log("jump to win page");
                        }
                    });
                }
            }, e);
        }
    },
    getAnswerLength: function(t) {
        return (t + "").length;
    },
    btnNum0000000000000: function(e) {
        var a = e.target.dataset.id, n = this.data.currentTimuObj;
        if (console.log(JSON.stringify(n)), 0 == n.needInput) {
            var i = this.data.currentAnswerObj;
            i.belowInput = 1, i.viewdaan = 0;
            var s = i.candidate;
            i.candidate = null == s ? a : s + "" + a, this.setData({
                currentAnswerObj: i,
                candidateAnswer: i.candidate
            });
        } else {
            var r = 0, u = 0, o = 0;
            if ("" != n.sfenzi && (u = n.sfenzi), "" != n.sint && (r = n.sint), "" != n.sfenmu && (o = n.sfenmu), 
            "sfenzi" == this.data.currentTimuObj.FenshuSelection) "" == (c = this.data.currentTimuObj.sfenzi) && (c = 0), 
            c = 10 * c + a, (d = this.data.currentTimuObj).sfenzi = c, u = c, this.setData({
                currentTimuObj: d
            }); else if ("sfenmu" == this.data.currentTimuObj.FenshuSelection) {
                "" == (c = this.data.currentTimuObj.sfenmu) && (c = 0), c = 10 * c + a, (d = this.data.currentTimuObj).sfenmu = c, 
                o = c, this.setData({
                    currentTimuObj: d
                });
            } else if ("sint" == this.data.currentTimuObj.FenshuSelection) {
                console.log("hello!");
                var d, c = this.data.currentTimuObj.sint;
                console.log(t(c)), "" == c && (c = 0), c = 10 * c + a, (d = this.data.currentTimuObj).sint = c, 
                r = c, this.setData({
                    currentTimuObj: d
                });
            }
            var l = r;
            o > 0 && u > 0 && (l = r + u / o, this.isHuzhi(o, u) || (l = -1)), this.setData({
                candidateAnswer: l
            });
        }
        "fix" == this.data.stage ? this.checkAnswer4FixStage() : this.checkAnswer();
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
        var e = t.target.dataset.id, a = this.data.currentTimuObj;
        if (console.log(JSON.stringify(a)), 0 == a.needInput) {
            var n = this.data.currentAnswerObj, i = this.data.candidateAnswer;
            i += e.toString(), n.candidate = i, n.belowInput = 1, n.viewdaan = 0, this.setData({
                currentAnswerObj: n,
                candidateAnswer: n.candidate
            });
        } else {
            console.log("分支2");
            var s = 0, r = 0, u = 0;
            if ("" != a.sfenzi && (r = a.sfenzi), "" != a.sint && (s = a.sint), "" != a.sfenmu && (u = a.sfenmu), 
            "sfenzi" == this.data.currentTimuObj.FenshuSelection) console.log("sfenzi"), "" == (d = this.data.currentTimuObj.sfenzi) && (d = 0), 
            d = 10 * d + e, (o = this.data.currentTimuObj).sfenzi = d, r = d, this.setData({
                currentTimuObj: o
            }); else if ("sfenmu" == this.data.currentTimuObj.FenshuSelection) {
                console.log("sfenmu"), "" == (d = this.data.currentTimuObj.sfenmu) && (d = 0), d = 10 * d + e, 
                (o = this.data.currentTimuObj).sfenmu = d, u = d, this.setData({
                    currentTimuObj: o
                }), console.log(JSON.stringify(o));
            } else if ("sint" == this.data.currentTimuObj.FenshuSelection) {
                console.log("hello!");
                var o, d = this.data.currentTimuObj.sint, c = this.data.currentTimuObj.sint;
                d = 10 * d + e, c += e.toString(), (o = this.data.currentTimuObj).sint = c, s = parseFloat(c), 
                this.setData({
                    currentTimuObj: o
                });
            }
            var l = parseFloat(c);
            if (u > 0 && r > 0) console.log("tint=" + s), console.log("tfenzi=" + r), console.log("tfenmu=" + u), 
            l = parseFloat(s) + r / u, this.isHuzhi(u, r) || (l = -1);
            this.setData({
                candidateAnswer: l
            });
        }
        "fix" == this.data.stage ? this.checkAnswer4FixStage() : this.checkAnswer();
    },
    isHuzhi: function(t, e) {
        var a, n, i = 1;
        for (t <= e ? (a = t, n = e) : (a = e, n = t); 0 != i; ) i = n % a, n = a, a = i;
        return 1 == n;
    },
    btnDot0: function() {
        if (!((this.data.candidateAnswer + "").indexOf(".") >= 0) && 0 == this.data.currentTimuObj.needInput) {
            var t = this.data.currentAnswerObj;
            t.belowInput = 1, t.viewdaan = 0;
            var e = t.candidate;
            return t.candidate = null == e ? num : e + ".", void this.setData({
                currentAnswerObj: t,
                candidateAnswer: t.candidate
            });
        }
    },
    btnDot: function() {
        this.playAudio("click");
        var t = this.data.currentTimuObj, e = this.data.candidateAnswer;
        if (e += ".", !(0 == this.data.manyInput && e.indexOf(".") >= 0)) {
            this.setData({
                candidateAnswer: e
            }), console.log("用户输入：" + e), t.sint = e, this.setData({
                currentTimuObj: t
            });
            var a = this.data.currentAnswerObj;
            a.candidate = this.data.candidateAnswer, a.belowInput = 1, a.viewdaan = 0, 0 == t.needInput && this.setData({
                currentAnswerObj: a,
                candidateAnswer: a.candidate
            });
        }
    },
    btnClear: function() {
        if (0 == this.data.currentTimuObj.needInput) {
            var t = this.data.currentAnswerObj, e = null == t.candidate ? "" : t.candidate;
            return e.length > 0 && (e = e.substring(0, e.length - 1)), t.candidate = e, void this.setData({
                currentAnswerObj: t,
                candidateAnswer: e
            });
        }
        if ("sfenzi" == this.data.currentTimuObj.FenshuSelection) a = "" == (a = this.data.currentTimuObj.sfenzi) || a < 10 ? "" : Math.floor(a / 10), 
        (n = this.data.currentTimuObj).sfenzi = a, this.setData({
            currentTimuObj: n
        }); else if ("sfenmu" == this.data.currentTimuObj.FenshuSelection) {
            var a;
            a = "" == (a = this.data.currentTimuObj.sfenmu) || a < 10 ? "" : Math.floor(a / 10), 
            (n = this.data.currentTimuObj).sfenmu = a, this.setData({
                currentTimuObj: n
            });
        } else if ("sint" == this.data.currentTimuObj.FenshuSelection) {
            console.log("hello!it's me");
            var n, i = this.data.currentTimuObj.sint;
            i.length >= 1 && (i = i.substring(0, i.length - 1)), (n = this.data.currentTimuObj).sint = i, 
            this.setData({
                currentTimuObj: n
            });
        }
        this.playAudio("delete");
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
    btnDaan: function() {
        var t = this.data.currentAnswerObj;
        t.viewdaan = 1, this.setData({
            currentAnswerObj: t,
            candidateAnswer: t.realAnswer
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
        void 0 !== this.context && (this.context.clearRect(0, 0, t, e), wx.drawCanvas({
            canvasId: "myCanvas",
            reserve: !0,
            actions: this.context.getActions()
        })), this.setData({
            view_class: "hide"
        }), this.setData({
            IsOnTuya: 0
        });
    },
    onPullDownRefresh: function() {
        wx.stopPullDownRefresh();
    },
    btnjq: function(t) {
        var e = t.currentTarget.dataset.jqlink;
        wx.navigateTo({
            url: "/pages/article/article?url=" + e
        });
    },
    btnFeedback: function() {
        var t = this.data.timuObj[this.data.currentIndex].timu;
        a.globalData.timu_feedback = t;
        wx.navigateTo({
            url: "/pages/feedback/feedback"
        });
    },
    btnPrintview: function() {
        if (console.log(JSON.stringify(this.data.tiku)), "0|0|0|0" != this.data.tiku.printstyle) {
            var t = this.data.tiku, e = this.data.docId, a = "/pages/printview/printview?tiku=" + encodeURIComponent(JSON.stringify(t)) + "&docid=" + e + "&printcount=" + "-1&byid=2&pagenum=" + -1;
            console.log(a), wx.navigateTo({
                url: a
            });
        } else wx.showToast({
            title: "不支持打印",
            duration: 1e3,
            icon: "success"
        });
    },
    str2float: function(t) {
        if (console.log(t), -1 == t.indexOf("/")) return parseFloat(t);
        if (-1 == t.indexOf("u")) {
            var e = t.split("/").map(Number);
            return parseInt(e[0]) / parseInt(e[1]);
        }
        e = t.split(/u|\//);
        return parseInt(e[0]) + parseInt(e[1]) / parseInt(e[2]);
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