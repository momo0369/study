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
        fenshuInput: 0,
        manyInput: 0,
        dootSign: "······",
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
        wrongNums: 0,
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
        printinfo: {},
        timeFirstIn: new Date().valueOf(),
        showJQ: 0,
        showHongdian: 1,
        JQlink: ""
    },
    startX: 0,
    startY: 0,
    isClear: !1,
    onLoad: function(a) {
        this.data.timeFirstIn = new Date().valueOf();
        var e = JSON.parse(decodeURIComponent(a.tiku));
        console.log(JSON.stringify(e)), this.data.tiku = e;
        var i = a.docid;
        this.data.docId = a.docid;
        var n = this;
        wx.setNavigationBarTitle({
            title: e.xlname
        });
        var s = .7 * ((wx.getSystemInfoSync().windowWidth - 10) / 4), d = this.data.currentTimuObj, o = this.data.timufamily, r = this.data.timusize, c = this.data.daansize, u = this.data.daanfamily;
        null != e.timufamily && "" != e.timufamily && (o = e.timufamily), null != e.timusize && "" != e.timusize && (r = e.timusize), 
        null != e.daanfamily && "" != e.daanfamily && (u = e.daanfamily), null != e.daansize && "" != e.daansize && (c = e.daansize);
        var l = {
            timuInfo: e,
            btnHeight: s,
            currentTimuObj: d,
            timusize: r,
            timufamily: o,
            daansize: c,
            daanfamily: u
        };
        this.setData(l), 7 == e.dlid && 90 == e.xlid && this.setData({
            percentSign: "%"
        }), 91 == e.xlid && this.setData({
            fenshuInput: "1"
        }), e.jiqiao && "" != e.jiqiao && this.setData({
            showJQ: 1,
            JQlink: e.jiqiao
        }), this.setData({
            manual: e.manual
        });
        var h = t.globalData.showHongdian;
        this.setData({
            showHongdian: h
        });
        var g = e.xlid, m = "";
        -1 == i ? m = 1 == t.globalData.localDebug ? t.globalData.local_url + "createdoc?xlid=" + e.xlid + "&totalcount=10" : t.globalData.server_bridge + "function=createdoc&xlid=" + e.xlid + "&totalcount=10" : (i = a.docid, 
        m = 1 == t.globalData.localDebug ? t.globalData.local_url + "getdoc?docid=" + i : t.globalData.server_bridge + "function=getdoc&docid=" + i), 
        console.log(m), wx.showLoading({
            title: "加载中"
        }), wx.request({
            url: m,
            method: "GET",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(a) {
                var i = a.data.data.timus;
                i.length > 10 && i.splice(10), i = t.setTimuStyle(g, i, e.page), n.setData({
                    timuObj: i,
                    totalTimuNum: i.length,
                    docId: a.data.data.docId
                }), n.loadTimu();
            },
            complete: function(t) {
                wx.hideLoading();
            }
        }), wx.hideTabBar({}), this.innerAudioContext = wx.createInnerAudioContext(), this.innerAudioContext2 = wx.createInnerAudioContext();
    },
    btnFeedback: function() {
        var a = this.data.currentTimuObj.timu;
        t.globalData.timu_feedback = a;
        wx.navigateTo({
            url: "/pages/feedback/feedback"
        });
    },
    loadTimu: function() {
        var t = this.data.timuObj[this.data.currentIndex];
        this.setData({
            progressid: "progress" + this.data.totalRight
        }), t.daan.indexOf("|") > 0 ? this.setData({
            manyInput: 1
        }) : this.setData({
            manyInput: 0
        });
        var a = {
            timu: t.timu,
            daan: t.daan,
            realAnswer: t.realAnswer
        }, e = {
            realAnswer: t.daan,
            viewdaan: 0,
            inputAnswer: ""
        };
        this.setData({
            currentTimuObj: a,
            currentAnswerObj: e
        });
    },
    loadTimu4Wrong: function() {
        if (0 != this.data.wrongTimuSet.length) {
            var t = this.data.wrongTimuSet.pop();
            t.daan.indexOf("|") > 0 ? this.setData({
                manyInput: 1
            }) : this.setData({
                manyInput: 0
            }), this.setData({
                progressid: "progress" + this.data.totalRight
            });
            var a = {
                timu: t.timu,
                daan: t.daan
            };
            this.setData({
                currentTimuObj: a
            });
        }
    },
    mathAnswerEqual: function(t, a) {
        return console.log("calAnswer=" + t + ",rightAnswer=" + a), t == a || Math.abs(t - a) < .001;
    },
    checkAnswer: function(a) {
        var e = this.data.candidateAnswer, i = 400, n = this.data.currentTimuObj.daan.replace("%", "");
        if (n = (n = n.replace("|0", "")).replace("|", "······"), this.mathAnswerEqual(e, n)) {
            (this.data.totalTimuNum != this.data.currentIndex + 1 || this.data.wrongTimuSet.length > 0) && this.playAudio2("success");
            var s = this;
            void 0 !== a && 0 == a || (i = 200), setTimeout(function() {
                if (0 == a ? s.setData({
                    inputRightFlagHidden: "hide",
                    candidateAnswer: ""
                }) : s.setData({
                    inputRightFlagHidden: "visiable",
                    candidateAnswer: ""
                }), s.data.totalTimuNum == s.data.currentIndex + 1) {
                    if (s.data.wrongTimuSet.length > 0) return s.data.stage = "fix", s.setData({
                        stageHidden: "visiable",
                        inputRightFlagHidden: "hide",
                        candidateAnswer: "",
                        currentIndex: ++s.data.currentIndex,
                        totalRight: ++s.data.totalRight
                    }), void s.loadTimu4Wrong();
                    if (s.data.isHelped) wx.redirectTo({
                        url: "score_fail?params=" + JSON.stringify(s.data.timuInfo) + "&tiku=" + encodeURIComponent(JSON.stringify(s.data.tiku)),
                        success: function() {
                            console.log("jump to failed page");
                        }
                    }); else {
                        var e = new Date().valueOf() - s.data.timeFirstIn;
                        s.data.timuInfo.timecost = e;
                        var i = s.data.tiku, n = "/pages/timu2/score_win?tiku=" + encodeURIComponent(JSON.stringify(i)) + "&timecost=" + e + "&wrongnums=0";
                        wx.redirectTo({
                            url: n,
                            success: function() {
                                console.log("jump to win page");
                            }
                        });
                    }
                    var d = "";
                    return d = 1 == t.globalData.localDebug ? t.globalData.local_url + "deletedocbyid?docid=" + s.data.docId : t.globalData.server_bridge + "function=deletedocbyid&docid=" + s.data.docId, 
                    console.log("url1=" + d), void wx.request({
                        url: d,
                        method: "GET",
                        header: {
                            "Content-Type": "application/json;charset=UTF-8"
                        },
                        success: function(t) {}
                    });
                }
                setTimeout(function() {
                    s.setData({
                        inputRightFlagHidden: "hide",
                        candidateAnswer: "",
                        currentIndex: ++s.data.currentIndex,
                        totalRight: ++s.data.totalRight
                    }), s.loadTimu();
                }, 500);
            }, i);
        } else {
            s = this;
            this.getAnswerLength(e.replace(this.data.dootSign, "|")) == this.getAnswerLength(this.data.currentTimuObj.daan) && setTimeout(function() {
                s.innerAudioContext.src = "/pages/resource/jiong.mp3", s.innerAudioContext.play(), 
                s.setData({
                    candidateAnswer: "",
                    inputWrongFlagHidden: "visiable"
                }), s.data.wrongTimuSet.push(s.data.timuObj[s.data.currentIndex]), s.data.wrongNums += 1, 
                setTimeout(function() {
                    if (s.data.totalTimuNum == s.data.currentIndex + 1) return s.data.stage = "fix", 
                    s.setData({
                        stageHidden: "visiable",
                        inputWrongFlagHidden: "hide",
                        candidateAnswer: ""
                    }), void s.loadTimu4Wrong();
                    s.setData({
                        inputWrongFlagHidden: "hide",
                        candidateAnswer: "",
                        currentIndex: ++s.data.currentIndex
                    }), s.loadTimu();
                }, 500);
            }, 200);
        }
    },
    checkAnswer4FixStage: function(t) {
        var a = this.data.candidateAnswer, e = 1e3;
        if (this.mathAnswerEqual(a, this.data.currentTimuObj.daan.replace("%", ""))) {
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
                }, 200); else if (i.data.isHelped) wx.navigateTo({
                    url: "score_fail?params=" + JSON.stringify(i.data.timuInfo),
                    success: function() {
                        console.log("jump to failed page");
                    }
                }); else {
                    var a = new Date().valueOf() - i.data.timeFirstIn;
                    i.data.timuInfo.timecost = a;
                    var e = i.data.tiku, n = i.data.wrongNums;
                    console.log("错题数量：" + n), console.log("订正完错题后，准备跳转");
                    var s = "/pages/timu2/score_win?tiku=" + encodeURIComponent(JSON.stringify(e)) + "&timecost=" + a + "&wrongnums=" + n;
                    wx.navigateTo({
                        url: s,
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
        var a = t.target.dataset.id, e = this.data.candidateAnswer + a;
        this.setData({
            candidateAnswer: e
        }), "fix" == this.data.stage ? this.checkAnswer4FixStage() : this.checkAnswer(), 
        this.playAudio("click");
    },
    btnDivide: function(t) {
        var a = this.data.candidateAnswer + "/";
        this.setData({
            candidateAnswer: a
        }), "fix" == this.data.stage ? this.checkAnswer4FixStage() : this.checkAnswer();
    },
    btnManyinput: function(t) {
        var a = this.data.candidateAnswer;
        "" == a || a.indexOf("······") > 0 || (a += this.data.dootSign, this.setData({
            candidateAnswer: a
        }), "fix" == this.data.stage ? this.checkAnswer4FixStage() : this.checkAnswer());
    },
    btnDot: function() {
        console.log("candidateAnswer=" + this.data.candidateAnswer);
        var t = this.data.candidateAnswer;
        0 == this.data.manyInput && t.indexOf(".") >= 0 || (this.setData({
            candidateAnswer: t + "."
        }), this.playAudio("click"));
    },
    btnClear: function() {
        var t = this.data.candidateAnswer, a = t.length;
        0 != a && (t = t.indexOf(this.data.dootSign) > 0 && t.indexOf(this.data.dootSign) == t.length - this.data.dootSign.length ? t.substring(0, a - this.data.dootSign.length) : t.substring(0, a - 1), 
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
            candidateAnswer: t.daan.replace("|", this.data.dootSign)
        }), this.setData({
            isHelped: !0
        }), "fix" == this.data.stage ? this.checkAnswer4FixStage(!1) : this.checkAnswer(!1);
    },
    selectedA: function(t) {
        console.log(t.currentTarget.dataset.fenzi), this.setData({
            fenzi: "|"
        });
        var a = this;
        setInterval(function() {
            a.setData({
                fenzi: ""
            });
        }, 500), setInterval(function() {
            a.setData({
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
        console.log("here"), void 0 !== this.context && (this.context.clearRect(0, 0, t, a), 
        wx.drawCanvas({
            canvasId: "myCanvas",
            reserve: !0,
            actions: this.context.getActions()
        }));
    },
    closeCanvas: function() {
        var t = wx.getSystemInfoSync().screenWidth, a = wx.getSystemInfoSync().screenHeight;
        void 0 !== this.context && (this.context.clearRect(0, 0, t, a), wx.drawCanvas({
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
        var a = t.currentTarget.dataset.jqlink;
        wx.navigateTo({
            url: "/pages/article/article?url=" + a
        });
    },
    btnPrintview: function() {
        if (console.log(JSON.stringify(this.data.tiku)), "0|0|0|0" != this.data.tiku.printstyle) {
            var t = this.data.tiku, a = this.data.docId, e = "/pages/printview/printview?tiku=" + encodeURIComponent(JSON.stringify(t)) + "&docid=" + a + "&printcount=" + "-1&byid=2&pagenum=" + -1;
            console.log(e), wx.navigateTo({
                url: e
            });
        } else wx.showToast({
            title: "不支持打印",
            duration: 1e3,
            icon: "success"
        });
    },
    preventTouchMove: function() {},
    onShareAppMessage: function() {
        var t = this.data.tiku, a = t.page;
        return {
            title: "待完成：" + t.xlname,
            path: "/pages/timu2/" + a + "?tiku=" + encodeURIComponent(JSON.stringify(t)) + "&docid=" + -1
        };
    },
    playAudio: function(t) {
        var a = "/pages/resource/" + t + ".mp3";
        this.innerAudioContext.src = a, this.innerAudioContext.play();
    },
    playAudio2: function(t) {
        var a = "/pages/resource/" + t + ".mp3";
        this.innerAudioContext2.src = a, this.innerAudioContext2.play();
    },
    nouse: function() {}
});