var t = require("../../@babel/runtime/helpers/defineProperty"), a = getApp();

Page({
    data: {
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
        divSign: "/",
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
        currentTimuObj: {
            timu: "",
            daan: "",
            calNums: 3,
            num0: {
                int: -1,
                fenshu: 1,
                fenzi: 2,
                fenmu: 3,
                sign: "+"
            },
            num1: {
                int: 4,
                fenshu: -1,
                fenzi: 2,
                fenmu: 3,
                sign: "÷"
            },
            num2: {
                int: 5,
                fenshu: 1,
                fenzi: 2,
                fenmu: 13,
                sign: "×"
            }
        },
        currentTimuTemplateName: "jiefangcheng",
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
        var e = JSON.parse(t.params), i = this;
        wx.setNavigationBarTitle({
            title: e.title
        });
        var n = .7 * ((wx.getSystemInfoSync().windowWidth - 10) / 4), s = this.data.currentTimuObj, r = this.data.timufamily, d = this.data.timusize, u = this.data.daansize, o = this.data.daanfamily;
        null != e.timufamily && "" != e.timufamily && (r = e.timufamily), null != e.timusize && "" != e.timusize && (d = e.timusize), 
        null != e.daanfamily && "" != e.daanfamily && (o = e.daanfamily), null != e.daansize && "" != e.daansize && (u = e.daansize);
        var c = {
            timuInfo: e,
            btnHeight: n,
            currentTimuObj: s,
            timusize: d,
            timufamily: r,
            daansize: u,
            daanfamily: o
        };
        this.setData(c), e.jiqiao && "" != e.jiqiao && this.setData({
            showJQ: 1,
            JQlink: e.jiqiao
        });
        var h = a.globalData.server_bridge + "function=createtimu&xlid=" + e.xlid;
        wx.request({
            url: h,
            method: "POST",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(t) {
                console.log(t), i.setData({
                    currentTimuTemplateName: "jiefangcheng",
                    timuObj: t.data.data,
                    totalTimuNum: t.data.data.length
                }), i.loadTimu();
            }
        }), wx.hideTabBar({});
    },
    btnFeedback: function() {
        var t = this.data.timuObj[this.data.currentIndex].timu;
        a.globalData.timu_feedback = t;
        wx.navigateTo({
            url: "/pages/feedback/feedback"
        });
    },
    loadTimu: function() {
        var t = this.data.timuObj[this.data.currentIndex];
        this.setData({
            progressid: "progress" + this.data.totalRight
        });
        var e = t.timu, i = a.buildFenshuExpre(e, 1), n = {
            FenshuSelection: "sfenzi",
            sfenzi: "",
            sfenmu: "",
            calNums: i.length,
            nums: i,
            sint: ""
        };
        n.daan = t.realAnswer;
        t.answer, n.answerInt = 0, t.answer.indexOf("U") > 0 && (n.answerInt = 1), n.realAnswer = t.realAnswer, 
        n.showAnswer = t.answer, this.setData({
            candidateAnswer: "",
            currentTimuObj: n
        });
    },
    loadTimu4Wrong: function() {
        if (0 != this.data.wrongTimuSet.length) {
            var t = this.data.wrongTimuSet.pop();
            this.setData({
                progressid: "progress" + this.data.totalRight
            });
            var e = a.buildFenshuExpre(t.timu, 1), i = {
                FenshuSelection: "sfenzi",
                sfenzi: "",
                sfenmu: "",
                calNums: e.length,
                nums: e,
                sint: ""
            };
            i.daan = t.realAnswer;
            t.answer, i.answerInt = 0, t.answer.indexOf("U") > 0 && (i.answerInt = 1), i.realAnswer = t.realAnswer, 
            i.showAnswer = t.answer, this.setData({
                candidateAnswer: "",
                currentTimuObj: i
            });
        }
    },
    parseNumber: function(t, a) {
        var e = t.trim();
        return 0 == e.indexOf("(") && (a.pre = "(", e = e.substring(1)), e.indexOf(")") > 0 && (a.tail = ")", 
        e = e.substring(0, e.length - 1)), isNaN(e), e;
    },
    isHuzhi: function(t, a) {
        var e, i, n = 1;
        for (t <= a ? (e = t, i = a) : (e = a, i = t); 0 != n; ) n = i % e, i = e, e = n;
        return 1 == i;
    },
    mathAnswerEqual: function(t, a) {
        var e = t + "", i = -1;
        if (e.indexOf(this.data.divSign) > 0) {
            var n = e.indexOf(this.data.divSign), s = e.substring(0, n), r = e.substring(n + 1);
            if ("0" == r) return;
            var d = parseInt(s, 10), u = parseInt(r, 10);
            i = d / u, d > 0 && u > 0 && (this.isHuzhi(d, u) || (i = -1));
        } else i = parseFloat(e);
        var o = Math.abs(i - a);
        return console.log(t + " -" + a + " - " + o), o < .001;
    },
    checkAnswer: function(a) {
        var e = this.data.candidateAnswer, i = 1e3;
        if (this.mathAnswerEqual(e, this.data.currentTimuObj.daan)) {
            var n = this;
            void 0 !== a && 0 == a || (i = 200), setTimeout(function() {
                if (0 == a ? n.setData({
                    inputRightFlagHidden: "hide",
                    candidateAnswer: ""
                }) : n.setData({
                    inputRightFlagHidden: "visiable",
                    candidateAnswer: ""
                }), n.data.totalTimuNum != n.data.currentIndex + 1) setTimeout(function() {
                    var a;
                    n.setData((t(a = {
                        candidateAnswer: "",
                        inputRightFlagHidden: "hide"
                    }, "candidateAnswer", ""), t(a, "currentIndex", ++n.data.currentIndex), t(a, "totalRight", ++n.data.totalRight), 
                    a)), n.loadTimu();
                }, 500); else {
                    var e;
                    if (n.data.wrongTimuSet.length > 0) return n.data.stage = "fix", n.setData((t(e = {
                        candidateAnswer: "",
                        stageHidden: "visiable",
                        inputRightFlagHidden: "hide"
                    }, "candidateAnswer", ""), t(e, "currentIndex", ++n.data.currentIndex), t(e, "totalRight", ++n.data.totalRight), 
                    e)), void n.loadTimu4Wrong();
                    if (n.data.isHelped) wx.navigateTo({
                        url: "score_fail?params=" + JSON.stringify(n.data.timuInfo),
                        success: function() {
                            console.log("jump to failed page");
                        }
                    }); else {
                        var i = new Date().valueOf() - n.data.timeFirstIn;
                        n.data.timuInfo.timecost = i, wx.navigateTo({
                            url: "score_win?params=" + JSON.stringify(n.data.timuInfo),
                            success: function() {
                                console.log("jump to win page");
                            }
                        });
                    }
                }
            }, i);
        } else {
            n = this;
            this.getAnswerLength(e) == this.getAnswerLength(this.data.currentTimuObj.daan) && setTimeout(function() {
                var a;
                n.setData((t(a = {
                    candidateAnswer: ""
                }, "candidateAnswer", ""), t(a, "inputWrongFlagHidden", "visiable"), a)), n.data.wrongTimuSet.push(n.data.timuObj[n.data.currentIndex]), 
                setTimeout(function() {
                    var a;
                    if (n.data.totalTimuNum == n.data.currentIndex + 1) return n.data.stage = "fix", 
                    n.setData(t({
                        candidateAnswer: "",
                        stageHidden: "visiable",
                        inputWrongFlagHidden: "hide"
                    }, "candidateAnswer", "")), void n.loadTimu4Wrong();
                    n.setData((t(a = {
                        candidateAnswer: "",
                        inputWrongFlagHidden: "hide"
                    }, "candidateAnswer", ""), t(a, "currentIndex", ++n.data.currentIndex), a)), n.loadTimu();
                }, 500);
            }, 200);
        }
    },
    checkAnswer4FixStage: function(t) {
        var a = this.data.candidateAnswer, e = 1e3;
        if (this.mathAnswerEqual(a, this.data.currentTimuObj.daan)) {
            var i = this;
            void 0 !== t && 0 == t || (e = 200), setTimeout(function() {
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
                    }), i.loadTimu4Wrong();
                }, 500); else if (i.data.isHelped) wx.navigateTo({
                    url: "score_fail?params=" + JSON.stringify(i.data.timuInfo),
                    success: function() {
                        console.log("jump to failed page");
                    }
                }); else {
                    var a = new Date().valueOf() - i.data.timeFirstIn;
                    i.data.timuInfo.timecost = a, wx.navigateTo({
                        url: "score_win?params=" + JSON.stringify(i.data.timuInfo),
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
    btnNum: function(t) {
        var a = t.target.dataset.id, e = (this.data.currentTimuObj, this.data.candidateAnswer + a);
        this.setData({
            candidateAnswer: e
        }), "fix" == this.data.stage ? this.checkAnswer4FixStage() : this.checkAnswer();
    },
    btnDot: function() {
        if (!((t = this.data.candidateAnswer + "").indexOf(".") >= 0)) {
            var t = this.data.candidateAnswer + ".";
            this.setData({
                candidateAnswer: t
            });
        }
    },
    btnDiv: function() {
        if (!((t = this.data.candidateAnswer).indexOf(this.data.divSign) >= 0)) {
            var t = this.data.candidateAnswer + this.data.divSign;
            this.setData({
                candidateAnswer: t
            });
        }
    },
    btnClear: function() {
        var t = this.data.candidateAnswer;
        0 != t.length && this.setData({
            candidateAnswer: t.substring(0, t.length - 1)
        });
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
        this.setData({
            candidateAnswer: t.showAnswer
        }), this.setData({
            isHelped: !0
        }), "fix" == this.data.stage ? this.checkAnswer4FixStage(!1) : this.checkAnswer(!1);
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
        var a = t.changedTouches[0].x, e = t.changedTouches[0].y;
        this.isClear ? (this.context.save(), this.context.moveTo(this.startX, this.startY), 
        this.context.lineTo(a, e), this.context.stroke(), this.context.restore(), this.startX = a, 
        this.startY = e) : (this.context.moveTo(this.startX, this.startY), this.context.lineTo(a, e), 
        this.context.stroke(), this.startX = a, this.startY = e), wx.drawCanvas({
            canvasId: "myCanvas",
            reserve: !0,
            actions: this.context.getActions()
        });
    },
    touchEnd: function() {},
    clearCanvas: function() {
        var t = wx.getSystemInfoSync().screenWidth, a = wx.getSystemInfoSync().screenHeight;
        this.context.clearRect(0, 0, t, a), wx.drawCanvas({
            canvasId: "myCanvas",
            reserve: !0,
            actions: this.context.getActions()
        });
    },
    closeCanvas: function() {
        var t = wx.getSystemInfoSync().screenWidth, a = wx.getSystemInfoSync().screenHeight;
        this.context.clearRect(0, 0, t, a), wx.drawCanvas({
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
    btnprint: function() {
        wx.navigateTo({
            url: "/pages/tuijian/yulan?params=" + JSON.stringify(this.data.timuInfo)
        });
    },
    btnjq: function(t) {
        var a = t.currentTarget.dataset.jqlink;
        wx.navigateTo({
            url: "/pages/tuijian/tuijian?params=" + a
        });
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