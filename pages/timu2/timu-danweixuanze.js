var t, a = require("../../@babel/runtime/helpers/defineProperty"), e = getApp();

Page({
    data: (t = {
        tiku: {},
        docId: -1,
        danweis: [],
        idanswer: "answer",
        view_class: "hide",
        stageHidden: "hide",
        btnHeight: 1,
        navigateBarTitle: "",
        timuObj: null,
        currentIndex: 0,
        progressid: "progress0"
    }, a(t, "stageHidden", "hide"), a(t, "inputRightFlagHidden", "hide"), a(t, "inputWrongFlagHidden", "hide"), 
    a(t, "totalTimuNum", 10), a(t, "totalRight", 0), a(t, "isHelped", !1), a(t, "wrongTimuSet", []), 
    a(t, "currentTimuObj", {
        timu: "",
        daan: ""
    }), a(t, "candidateAnswer", ""), a(t, "candidateUserAnswer", ""), a(t, "timusize", 24), 
    a(t, "timufamily", ""), a(t, "daansize", 24), a(t, "daanfamily", ""), a(t, "stage", "normal"), 
    a(t, "timuInfo", {}), a(t, "timeFirstIn", new Date().valueOf()), t),
    startX: 0,
    startY: 0,
    isClear: !1,
    onLoad: function(t) {
        this.data.timeFirstIn = new Date().valueOf();
        var a = JSON.parse(decodeURIComponent(t.tiku));
        this.data.tiku = a;
        t.docid;
        this.data.docId = t.docid;
        var i = this;
        wx.setNavigationBarTitle({
            title: a.title
        });
        var n = .6 * ((wx.getSystemInfoSync().windowWidth - 10) / 4), d = this.data.currentTimuObj, s = this.data.timufamily, r = this.data.timusize, o = this.data.daansize, u = this.data.daanfamily;
        null != a.timufamily && "" != a.timufamily && (s = a.timufamily), null != a.timusize && "" != a.timusize && (r = a.timusize), 
        null != a.daanfamily && "" != a.daanfamily && (u = a.daanfamily), null != a.daansize && "" != a.daansize && (o = a.daansize);
        var l = {
            timuInfo: a,
            btnHeight: n,
            currentTimuObj: d,
            timusize: r,
            timufamily: s,
            daansize: o,
            daanfamily: u
        };
        this.setData(l);
        var c = a.xlid, g = "";
        g = 1 == e.globalData.localDebug ? e.globalData.local_url + "createdoc?xlid=" + c + "&totalcount=10" : e.globalData.server_bridge + "function=createdoc&xlid=" + c + "&totalcount=10", 
        console.log(g), wx.showLoading({
            title: "加载中"
        }), wx.request({
            url: g,
            method: "GET",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(t) {
                var n = t.data.data.timus;
                n.length > 10 && n.splice(10), n = e.setTimuStyle(c, n, a.page), console.log("timus=timuObj=" + JSON.stringify(n)), 
                i.setData({
                    timuObj: n,
                    totalTimuNum: n.length,
                    docId: t.data.data.docId
                }), i.loadTimu();
            },
            complete: function(t) {
                wx.hideLoading();
            }
        });
        var m = a.xlid - 102, h = this.getBiaozhunDanweiArr(m);
        console.log(h), this.setData({
            danweis: h
        }), wx.hideTabBar({}), this.innerAudioContext = wx.createInnerAudioContext();
    },
    btnFeedback: function() {
        var t = this.data.timuObj[this.data.currentIndex].timu;
        e.globalData.timu_feedback = t;
        wx.navigateTo({
            url: "/pages/feedback/feedback"
        });
    },
    loadTimu: function() {
        var t = this.data.timuObj[this.data.currentIndex];
        this.setData({
            progressid: "progress" + this.data.totalRight
        });
        var a = {
            timu: t.timu,
            daan: t.daan,
            standardized_daan: t.standardized_daan,
            realAnswer: t.realAnswer
        };
        this.setData({
            currentTimuObj: a
        });
    },
    loadTimu4Wrong: function() {
        if (0 != this.data.wrongTimuSet.length) {
            var t = this.data.wrongTimuSet.pop();
            console.log("错题timu=" + JSON.stringify(t)), this.setData({
                progressid: "progress" + this.data.totalRight
            });
            var a = {
                timu: t.timu,
                standardized_daan: t.standardized_daan,
                daan: t.daan
            };
            this.setData({
                currentTimuObj: a
            });
        }
    },
    checkAnswer: function(t) {
        var a = 1e3;
        if (this.data.candidateAnswer == this.data.currentTimuObj.standardized_daan) {
            var e = this;
            void 0 !== t && 0 == t || (a = 200), setTimeout(function() {
                if (0 == t ? e.setData({
                    inputRightFlagHidden: "hide",
                    candidateAnswer: ""
                }) : e.setData({
                    inputRightFlagHidden: "visiable",
                    candidateAnswer: ""
                }), e.data.totalTimuNum != e.data.currentIndex + 1) setTimeout(function() {
                    e.setData({
                        inputRightFlagHidden: "hide",
                        candidateAnswer: "",
                        currentIndex: ++e.data.currentIndex,
                        totalRight: ++e.data.totalRight
                    }), e.loadTimu();
                }, 500); else {
                    if (e.data.wrongTimuSet.length > 0) return e.data.stage = "fix", e.setData({
                        stageHidden: "visiable",
                        inputRightFlagHidden: "hide",
                        candidateAnswer: "",
                        currentIndex: ++e.data.currentIndex,
                        totalRight: ++e.data.totalRight
                    }), console.log("loadwrong2"), void e.loadTimu4Wrong();
                    if (e.data.isHelped) wx.navigateTo({
                        url: "score_fail?params=" + JSON.stringify(e.data.timuInfo),
                        success: function() {
                            console.log("jump to failed page");
                        }
                    }); else {
                        var a = new Date().valueOf() - e.data.timeFirstIn;
                        e.data.timuInfo.timecost = a;
                        var i = e.data.tiku, n = "/pages/timu2/score_win?tiku=" + encodeURIComponent(JSON.stringify(i)) + "&timecost=" + a + "&wrongnums=0";
                        console.log("url=" + n), wx.redirectTo({
                            url: n,
                            success: function() {
                                console.log("jump to win page");
                            }
                        });
                    }
                }
            }, a);
        } else {
            e = this;
            this.setData({
                inputWrongFlagHidden: "visiable"
            }), this.data.wrongTimuSet.push(this.data.timuObj[this.data.currentIndex]), setTimeout(function() {
                if (e.innerAudioContext.src = "/pages/resource/jiong.mp3", e.innerAudioContext.play(), 
                e.data.totalTimuNum == e.data.currentIndex + 1) return e.data.stage = "fix", e.setData({
                    stageHidden: "visiable",
                    inputWrongFlagHidden: "hide",
                    candidateAnswer: ""
                }), console.log("loadwrong3"), void e.loadTimu4Wrong();
                e.setData({
                    inputWrongFlagHidden: "hide",
                    candidateAnswer: "",
                    currentIndex: ++e.data.currentIndex
                }), e.loadTimu();
            }, 500);
        }
    },
    checkAnswer4FixStage: function(t) {
        console.log("这里的currentTimuObj=" + JSON.stringify(this.data.currentTimuObj));
        var a = this.data.candidateAnswer, e = 1e3;
        if (console.log("这里：candidateAnswer=" + a + ",standardized_daan=" + this.data.currentTimuObj.standardized_daan), 
        a == this.data.currentTimuObj.standardized_daan) {
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
                    }), console.log("loadwrong1"), i.loadTimu4Wrong();
                }, 200); else if (i.data.isHelped) wx.navigateTo({
                    url: "score_fail?params=" + JSON.stringify(i.data.timuInfo),
                    success: function() {
                        console.log("jump to failed page");
                    }
                }); else {
                    var a = new Date().valueOf() - i.data.timeFirstIn;
                    i.data.timuInfo.timecost = a;
                    var e = i.data.tiku;
                    console.log("准备从这里跳转");
                    var n = "/pages/timu2/score_win?tiku=" + encodeURIComponent(JSON.stringify(e)) + "&timecost=" + a + "&wrongnums=0";
                    wx.navigateTo({
                        url: n,
                        success: function() {
                            console.log("jump to win page");
                        }
                    });
                }
            }, e);
        }
    },
    playAudio: function(t) {
        var a = "/pages/resource/" + t + ".mp3";
        this.innerAudioContext.src = a, this.innerAudioContext.play();
    },
    btnBtn: function(t) {
        this.playAudio("click");
        var a = t.target.dataset, e = a.disp;
        this.setData({
            candidateAnswer: e,
            candidateUserAnswer: a.id
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
        console.log("answerObj=" + JSON.stringify(t)), t.viewdaan = 1, this.setData({
            candidateAnswer: t.daan
        }), this.setData({
            isHelped: !0
        }), "fix" == this.data.stage ? this.checkAnswer4FixStage(!1) : this.checkAnswer(!1);
    },
    getBiaozhunDanweiArr: function(t) {
        var a = [], e = [];
        switch (t) {
          case 1:
            a[0] = "公里", a[1] = "米", a[2] = "分米", a[3] = "厘米", a[4] = "毫米";
            break;

          case 2:
            a[0] = "平方公里", a[1] = "公顷", a[2] = "平方米", a[3] = "平方分米", a[4] = "平方厘米", a[5] = "平方毫米";
            break;

          case 3:
            a[0] = "立方米", a[1] = "立方分米", a[2] = "立方厘米", a[3] = "立方毫米";
            break;

          case 4:
            a[0] = "吨", a[1] = "千克", a[2] = "克";
            break;

          case 5:
            a[0] = "小时", a[1] = "分钟", a[2] = "秒", a[3] = "毫秒";
        }
        for (var i = 0; i < a.length; i++) {
            var n = {};
            n.dlid = t, n.xlid = i + 1, n.dwname = a[i], e.push(n);
        }
        return e;
    },
    onPullDownRefresh: function() {
        wx.stopPullDownRefresh();
    },
    onShareAppMessage: function() {
        var t = this.data.tiku, a = t.page;
        return {
            title: "待完成：" + t.xlname,
            path: "/pages/timu2/" + a + "?tiku=" + encodeURIComponent(JSON.stringify(t)) + "&docid=" + -1
        };
    },
    nouse: function() {}
});