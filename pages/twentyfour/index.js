var t = require("../../@babel/runtime/helpers/toConsumableArray");

require("../../@babel/runtime/helpers/Arrayincludes");

var e = getApp();

Page({
    data: {
        miniprogramId: 1,
        mode: 1,
        small_rate: 10,
        big_rate: 20,
        itemid: 1,
        timuid: -1,
        totalTimuNum: 5,
        ishelp: 0,
        numbersTop: 5,
        currentProgress: 0,
        btnHeight: 200,
        timuObjectArr: [],
        currentTimuPageObject: [ {
            visibility: "visiable",
            selected: "",
            value: "",
            disp: "",
            timuid: 1
        }, {
            visibility: "visiable",
            selected: "",
            value: "",
            disp: "",
            timuid: 1
        }, {
            visibility: "visiable",
            selected: "",
            value: "",
            disp: "",
            timuid: 1
        }, {
            visibility: "visiable",
            selected: "",
            value: "",
            disp: "",
            timuid: 1
        } ],
        currentTimuObject: {
            nums: [],
            answer: ""
        },
        operatorStatus: [ "", "", "", "" ],
        loadTime: 0,
        maskStatus: "none",
        videomaskStatus: "none",
        modeMaskStatus: "none",
        helpvideoUrl: "",
        gameMode: "normal",
        stagePercent: 0,
        stageCost: 0,
        normalCheck: "checked",
        hardCheck: "",
        daan: "",
        scoreArr: [],
        timecostArr: [],
        byhelprate_back_color: [ "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7" ],
        byhelprate_front_color: [ "#000", "#000", "#000", "#000", "#000", "#000" ],
        byhelprate_title_arr: [ "0-10%", "10-20%", "20-30%", "30-40%", "40-50%", "50-100%" ],
        byscope_back_color: [ "#f7f7f7", "#f7f7f7" ],
        byscope_front_color: [ "#000", "#000" ],
        byscope_title_arr: [ "难度随机,数字在9以内", "难度随机,数字可以大于9" ],
        scopeSelectedId: 0,
        helprateSelectedId: 0,
        showMask: !1,
        showDifficultyDialog: !1,
        difficultyById: 1,
        byitem_back_color: [ "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7" ],
        byitem_front_color: [ "#000", "#000", "#000", "#000", "#000", "#000", "#000", "#000", "#000" ],
        byitem_title_arr: [ "3×8", "4×6", "2×12", "直接相加", "巧用分配律", "分数运算", "25-1", "15+9", "16+8" ],
        itemSelectedId: 0,
        showItemDialog: !1,
        isPlaying: !1,
        playList: [],
        isPlayIdle: !0,
        nouse: 0
    },
    onLoad: function(t) {
        var a = this;
        this.data.miniprogramId = e.globalData.miniprogramId, this.setData({
            miniprogramId: e.globalData.miniprogramId
        });
        var i = wx.getSystemInfoSync().screenWidth, s = .54;
        wx.getSystemInfoSync().screenHeight / i > 2 && (this.setData({
            numbersTop: 0
        }), s = .74);
        var o = 337.5 * s;
        if (this.setData({
            btnHeight: o,
            loadTime: new Date().getTime()
        }), "string" == typeof t.share_flag && 1 == t.share_flag && (console.log("来自用户分享"), 
        this.data.mode = 5, this.data.timuid = parseInt(t.timuid), this.data.totalTimuNum = 1), 
        "string" == typeof t.replay_flag && 1 == t.replay_flag) {
            console.log("来自再玩一次");
            var n = JSON.parse(t.obj);
            this.data.mode = n.mode, this.data.totalTimuNum = 5, this.data.itemid = n.itemid, 
            this.data.scopeSelectedId = n.scopeSelectedId, this.data.helprateSelectedId = n.helprateSelectedId, 
            this.data.difficultyById = n.difficultyById;
        }
        this.loadTimu(), this.updateDifficultyDialog(), this.updateItemDialog(), this.innerAudioContext = wx.createInnerAudioContext(), 
        this.innerAudioContext.onEnded(function() {
            a.data.isPlaying = !1;
        }), this.innerAudioContext.onPlay(function() {}), this.innerAudioContext2 = wx.createInnerAudioContext();
    },
    playAudio: function(t) {
        var e = "/pages/resource/" + t + ".mp3";
        this.innerAudioContext.src = e, this.innerAudioContext.play();
    },
    playAudio2: function(t) {
        var e = "/pages/resource/" + t + ".mp3";
        this.innerAudioContext.src = e, this.innerAudioContext.play();
    },
    loadTimu: function() {
        var t = this, a = this.data.mode, i = this.data.small_rate, s = this.data.big_rate, o = this.data.itemid, n = this.data.timuid, r = this.data.totalTimuNum, c = "";
        c = 1 == e.globalData.localDebug ? e.globalData.local_url + "get24diantiku?mode=" + a + "&small_rate=" + i + "&big_rate=" + s + "&itemid=" + o + "&timuid=" + n + "&count=" + r : e.globalData.server_bridge + "function=get24diantiku&mode=" + a + "&small_rate=" + i + "&big_rate=" + s + "&itemid=" + o + "&timuid=" + n + "&count=" + r, 
        wx.showLoading({
            title: "加载中"
        }), wx.request({
            url: c,
            method: "GET",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(e) {
                console.log(e.data.data), t.data.timuObjectArr = t.dealDataFromSever(e.data.data), 
                t.data.totalTimuNum = e.data.data.length, t.setTimu();
            },
            complete: function(t) {
                wx.hideLoading();
            }
        });
    },
    loadBackupTimu: function() {
        var t = this, e = this.data.currentProgress, a = "https://www.xiaoxuestudy.com/kousuan_v2/bridge.php?function=get24diantiku&mode=" + this.data.mode + "&small_rate=" + this.data.small_rate + "&big_rate=" + this.data.big_rate + "&itemid=" + this.data.itemid + "&timuid=" + "-1&count=1";
        console.log("url=" + a), wx.showLoading({
            title: "加载中"
        }), wx.request({
            url: a,
            method: "GET",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(a) {
                console.log(a.data.data);
                var i = t.dealDataFromSever(a.data.data);
                t.data.timuObjectArr[e] = i[0], console.log("that.data.totalTimuNum=" + t.data.totalTimuNum), 
                t.setTimu();
            },
            complete: function(t) {
                wx.hideLoading();
            }
        });
    },
    dealDataFromSever: function(t) {
        for (var e = [], a = 0; a < t.length; a++) {
            var i = t[a], s = i.timuid, o = i.timu.split("-").map(Number), n = this.shuffleArray(o), r = i.daan1, c = i.daan2, u = i.daan3, d = r;
            null != c && (d = d + "\r\n" + c), null != u && (d = d + "\r\n" + u);
            var l = {};
            l.timuid = s, l.nums = n, l.answer = d, e.push(l);
        }
        return e;
    },
    shuffleArray: function(t) {
        for (var e = t.length - 1; e > 0; e--) {
            var a = Math.floor(Math.random() * (e + 1)), i = [ t[a], t[e] ];
            t[e] = i[0], t[a] = i[1];
        }
        return t;
    },
    setTimu: function() {
        this.data.ishelp = 0;
        for (var t = this.data.currentTimuPageObject, e = this.data.currentProgress, a = this.data.timuObjectArr[e], i = 0; i < 4; i++) t[i].timuid = a.timuid, 
        t[i].value = a.nums[i], t[i].disp = a.nums[i], t[i].visibility = "visiable", t[i].selected = "", 
        t[i].index = i, t[i].fontsize = 4;
        this.setData({
            currentTimuPageObject: t
        }), this.data.currentTimuObject = a;
        var s = new Date().getTime();
        this.data.loadTime = s;
    },
    createTimu: function() {
        this.data.ishelp = 0;
        for (var t = this.data.currentTimuPageObject, e = this.data.gameMode, a = this.getRandNum(e), i = 0; i < 4; i++) t[i].value = a.nums[i], 
        t[i].disp = a.nums[i], t[i].visibility = "visiable", t[i].selected = "", t[i].index = i, 
        t[i].fontsize = 4;
        this.setData({
            currentTimuPageObject: t
        });
    },
    switchMode: function() {
        this.setData({
            currentProgress: 0,
            loadTime: new Date().getTime()
        }), this.createTimu();
    },
    btnplay: function() {
        wx.navigateTo({
            url: "/pages/article/article?url=https://mp.weixin.qq.com/s/RPqYpBrWrrg5rijFaoVFeg"
        });
    },
    btnhuanyihuan: function() {
        this.loadBackupTimu();
    },
    closeVideo: function() {
        this.setData({
            videomaskStatus: "none"
        });
    },
    btnreplay: function() {
        for (var t = this.data.currentTimuPageObject, e = this.data.currentTimuObject, a = 0; a < 4; a++) t[a].value = e.nums[a], 
        t[a].disp = e.nums[a], t[a].visibility = "visiable", t[a].selected = "", t[a].index = a, 
        t[a].fontsize = 4;
        this.setData({
            currentTimuPageObject: t
        });
    },
    radiotap: function() {
        this.setData({
            modeMaskStatus: "none"
        });
    },
    daanMasktap: function() {
        this.setData({
            maskStatus: "none"
        });
    },
    radioChange: function(t) {
        var e = "normal";
        "1" == t.detail.value && (e = "hard"), this.setData({
            modeMaskStatus: "none",
            gameMode: e
        }), this.switchMode();
    },
    btnHelpRateTips: function() {
        wx.showModal({
            title: "求助率定义",
            showCancel: !1,
            content: "100个人如果有20人点击了答案按钮，则求助率为20%",
            confirmText: "我知道了",
            confirmColor: "#3abccc",
            success: function(t) {}
        });
    },
    btndaan: function() {
        this.data.ishelp = 1;
        var t = this.data.currentTimuObject;
        this.data.daan = t.answer, wx.showModal({
            title: "解题思路",
            showCancel: !1,
            content: t.answer,
            confirmText: "我知道了",
            confirmColor: "#3abccc",
            success: function(t) {}
        });
    },
    btnWolaichuti: function() {
        wx.navigateTo({
            url: "/pages/twentyfour/issue"
        });
    },
    btnShengzici: function() {
        wx.navigateToMiniProgram({
            appId: "wx4e37ef0e85854087",
            path: "pages/index/index",
            success: function(t) {
                console.log("success!");
            }
        });
    },
    btnNum: function(t) {
        this.playAudio("click");
        var e = this.data.currentTimuPageObject, a = this.data.operatorStatus, i = t.target.dataset, s = i.index;
        i.value;
        if ("selected" == e[s].selected) e[s].selected = "", this.setData({
            currentTimuPageObject: e
        }); else {
            for (var o = 0, n = -1, r = 0, c = -1, u = 0; u < 4; u++) "selected" == e[u].selected && (o++, 
            n = u);
            for (u = 0; u < 4; u++) "selected" == a[u] && (r++, c = u);
            for (u = 0; u < 4; u++) e[u].selected = "";
            if (e[s].selected = "selected", this.setData({
                currentTimuPageObject: e
            }), 1 == o && 1 == r) {
                var d = e[n].value, l = e[s].value, f = 0;
                0 == c ? f = d + l : 1 == c ? f = d - l : 2 == c ? f = d * l : 3 == c && (f = d / l), 
                e[s].value = f;
                var h = f.toString().split(".");
                if (e[s].disp = f, 2 == h.length) h[1].length > 2 && (h[1].startsWith("000") ? e[s].disp = h[0] : (e[s].fontsize = 2, 
                e[s].disp = f.toFixed(3)));
                f > 1e4 ? e[s].fontsize = 2 : f > 100 && (e[s].fontsize = 3), e[n].visibility = "hidden";
                for (u = 0; u < 4; u++) a[u] = "";
                this.setData({
                    currentTimuPageObject: e,
                    operatorStatus: a
                }), this.checkAnswer();
            }
        }
    },
    checkAnswer: function() {
        for (var t = this.data.currentTimuPageObject, a = this.data.currentProgress, i = 0, s = 0, o = 0; o < 4; o++) "visiable" == t[o].visibility && (i++, 
        s = t[o].value);
        if (1 == i && Math.abs(s - 24) < .001) {
            a++, this.setData({
                currentProgress: a
            });
            var n = this.data.currentTimuObject, r = n.timuid, c = this.data.ishelp;
            this.data.daan == n.answer && (c = 1);
            var u = "https://www.xiaoxuestudy.com/kousuan_v2/bridge.php?function=updatehelprate&timuid=" + r + "&ishelp=" + c;
            console.log(u), wx.request({
                url: u,
                method: "GET",
                header: {
                    "Content-Type": "application/json;charset=UTF-8"
                },
                success: function(t) {}
            });
            var d = e.globalData.unionId, l = (r = this.data.currentTimuObject.timuid, new Date().getTime() - this.data.loadTime), f = 1;
            f = 1 != c && 4 != this.data.mode ? 1 : 0;
            var h = "https://www.xiaoxuestudy.com/kousuan_v2/bridge.php?function=getsuan24dianrank&userid=" + d + "&timuid=" + r + "&timecost=" + l + "&flagupdate=" + f;
            wx.request({
                url: h,
                method: "GET",
                header: {
                    "Content-Type": "application/json;charset=UTF-8"
                },
                success: function(t) {
                    var e = t.data.data;
                    if (m.data.scoreArr.push(e), m.data.timecostArr.push(l), m.data.currentProgress == m.data.totalTimuNum) {
                        console.log("所有成绩都被下载了！");
                        for (var a = 0, i = m.data.scoreArr, s = m.data.timecostArr, o = i.length, n = 0, r = 0; r < o; r++) a += i[r], 
                        n += s[r];
                        var c = a / o;
                        c = (c = Math.fround(c)).toFixed(1);
                        var u = {};
                        u.mode = m.data.mode, u.itemid = m.data.itemid, u.scopeSelectedId = m.data.scopeSelectedId, 
                        u.helprateSelectedId = m.data.helprateSelectedId, u.difficultyById = m.data.difficultyById;
                        var d = "../twentyfour/success?score=" + c + "&timecost=" + n + "&obj=" + JSON.stringify(u);
                        return console.log(d), void wx.navigateTo({
                            url: d,
                            success: function() {}
                        });
                    }
                }
            });
            var m = this;
            if (a == this.data.totalTimuNum) return;
            this.playAudio2("success");
            wx.showToast({
                title: "回答正确",
                icon: "",
                duration: 400,
                success: function() {
                    setTimeout(function() {
                        m.setTimu();
                    }, 400);
                }
            });
        }
    },
    checkOperatorStatus: function(t) {
        var e = this.data.operatorStatus;
        if ("selected" == e[t]) e[t] = "", this.setData({
            operatorStatus: e
        }); else {
            for (var a = 0; a < 4; a++) e[a] = "";
            e[t] = "selected", this.setData({
                operatorStatus: e
            });
        }
    },
    btnplus: function() {
        this.checkOperatorStatus(0), this.playAudio("click");
    },
    btnminus: function() {
        this.checkOperatorStatus(1), this.playAudio("click");
    },
    btnmulti: function() {
        this.checkOperatorStatus(2), this.playAudio("click");
    },
    btndivide: function() {
        this.checkOperatorStatus(3), this.playAudio("click");
    },
    updateDifficultyDialog: function() {
        var t = [ "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7" ], e = [ "#4c4c4c", "#4c4c4c", "#4c4c4c", "#4c4c4c", "#4c4c4c", "#4c4c4c" ], a = [ "#f7f7f7", "#f7f7f7" ], i = [ "#4c4c4c", "#4c4c4c" ], s = this.data.mode, o = 0, n = this.data.difficultyById;
        1 == n && 4 != s ? (a[o = this.data.scopeSelectedId] = "#e6fbf4", i[o] = "#0bc78a") : 2 == n && 4 != s && (console.log("byId=" + n), 
        t[o = this.data.helprateSelectedId] = "#e6fbf4", e[o] = "#0bc78a"), this.setData({
            byscope_back_color: a,
            byscope_front_color: i,
            byhelprate_back_color: t,
            byhelprate_front_color: e
        });
    },
    btnDifficultyItem: function(t) {
        var e = t.currentTarget.dataset;
        console.log(e);
        var a = e.id, i = parseInt(e.byid);
        1 == i ? (console.log("byId=1"), this.data.scopeSelectedId = a) : 2 == i && (console.log("byId=2"), 
        this.data.helprateSelectedId = a), this.setData({
            difficultyById: i
        });
        var s = 1, o = 0, n = 100;
        if (1 == i && 0 == a) s = 1; else if (1 == i && 1 == a) s = 3; else if (i = 2) switch (s = 2, 
        a) {
          case 0:
            o = 0, n = 10;
            break;

          case 1:
            o = 10, n = 20;
            break;

          case 2:
          case 3:
          case 4:
            o = 20, n = 30;
            break;

          case 5:
            o = 50, n = 100;
        }
        this.data.mode = s, this.small_rate = o, this.big_rate = n, this.loadTimu(), this.updateDifficultyDialog(), 
        this.data.currentProgress = 0;
    },
    btnSpecialItem: function(t) {
        var e = t.currentTarget.dataset;
        console.log(e);
        var a = e.id;
        this.data.itemSelectedId = a, this.data.mode = 4, this.data.itemid = a + 1, this.loadTimu(), 
        this.updateItemDialog(), this.data.currentProgress = 0;
    },
    updateItemDialog: function() {
        var t = [ "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7", "#f7f7f7" ], e = [ "#4c4c4c", "#4c4c4c", "#4c4c4c", "#4c4c4c", "#4c4c4c", "#4c4c4c", "#4c4c4c", "#4c4c4c", "#4c4c4c" ], a = this.data.itemid - 1;
        4 == this.data.mode && (t[a] = "#e6fbf4", e[a] = "#0bc78a"), this.setData({
            byitem_back_color: t,
            byitem_front_color: e
        });
    },
    preventTouchMove: function() {},
    btnShowDifficultyDialog: function(t) {
        this.setData({
            showMask: !0,
            showDifficultyDialog: !0
        }), this.updateDifficultyDialog();
    },
    btnShowItemDialog: function(t) {
        this.setData({
            showMask: !0,
            showItemDialog: !0
        }), this.updateItemDialog();
    },
    btnMask: function(t) {
        t.currentTarget.dataset;
        this.setData({
            showMask: !1,
            showDifficultyDialog: !1,
            showItemDialog: !1
        });
    },
    btnCloseDialog: function(t) {
        var e = t.currentTarget.dataset;
        this.setData({
            showMask: !1
        });
        var a = e.dialogid;
        1 == a && this.setData({
            showDifficultyDialog: !1
        }), 2 == a && this.setData({
            showItemDialog: !1
        });
    },
    btnLearntime: function() {
        wx.navigateToMiniProgram({
            appId: "wx26be5a4d6585d38d",
            path: "pages/index/index",
            success: function(t) {}
        });
    },
    btnHanoi: function() {
        wx.navigateToMiniProgram({
            appId: "wx142d07941d69604d",
            path: "pages/index/index",
            success: function(t) {
                console.log("success!");
            }
        });
    },
    btnKousuan: function() {
        wx.navigateToMiniProgram({
            appId: "wxa9da1f6d7ade9510",
            path: "pages/index/index",
            success: function(t) {
                console.log("success!");
            }
        });
    },
    onReady: function() {},
    onShow: function() {},
    onHide: function() {},
    onUnload: function() {},
    onPullDownRefresh: function() {},
    onReachBottom: function() {},
    onShareAppMessage: function(t) {
        console.log(t);
        for (var e = this.data.currentTimuObject, a = "", i = 0; i < 4; i++) 3 != i ? a += e.nums[i] + "-" : 3 == i && (a += e.nums[i]);
        return t.from, {
            title: a + "如何算24点?",
            imageUrl: "",
            path: "/pages/twentyfour/index?share_flag=1&timuid=" + this.data.currentTimuObject.timuid,
            success: function(t) {},
            fail: function(t) {}
        };
    },
    getRandNum: function(t) {
        var e = {}, a = new Array(), i = !1;
        do {
            i = !1;
            for (var s = 0; s < 4; s++) "normal" == t ? (a[s] = Math.round(8 * Math.random() + 1), 
            i = !0) : (a[s] = Math.round(13 * Math.random() + 1), a[s] > 9 && (i = !0));
            e.nums = a, e.answer = this.isSolvable(a);
        } while (!i || null == e.answer);
        return e;
    },
    batchGetTimus: function() {
        for (var e = [], a = [], i = [], s = [], o = 1; o <= 13; o++) for (var n = 1; n <= 13; n++) for (var r = 1; r <= 13; r++) for (var c = 1; c <= 13; c++) {
            e[0] = o, e[1] = n, e[2] = r, e[3] = c;
            var u = this.isSolvable(e);
            if (u) {
                e.sort(function(t, e) {
                    return t - e;
                });
                var d = e[0] + "-" + e[1] + "-" + e[2] + "-" + e[3];
                if (!a.includes(d)) {
                    a.push(d), i.push(u), u.length > 4180 && (console.log("题目:" + d + "的答案长度=" + u.length), 
                    s.push(d)), console.log(s);
                    var l = "http://localhost:8888/kousuan_v2/inserttimutemp?timu=" + d + "&daan=" + encodeURIComponent(u);
                    wx.request({
                        url: l,
                        success: function(t) {},
                        fail: function() {
                            console.log("fail!---timu=" + d);
                        }
                    });
                }
            }
        }
        t(new Set(a));
    },
    isSolvable: function(t) {
        console.log("isSovlvable");
        var e = this.valid(t);
        return null == e || "" == e.value ? null : e.value;
    },
    tb: function(t, e, a, i) {
        this[1] = t, this[2] = e, this[4] = a, this[8] = i;
    },
    tdisoper: function(t, e, a, i) {
        this[0] = t, this[1] = e, this[2] = a, this[3] = i;
    },
    oper: function(t, e, a) {
        return 3 == t ? e * a : 2 == t ? e / a : 1 == t ? parseFloat(e) + parseFloat(a) : 0 == t ? e - a : void 0;
    },
    valid: function(t) {
        for (var e = new this.tdisoper("-", "+", "÷", "×"), a = new this.tb(t[0], t[1], t[2], t[3]), i = {
            value: ""
        }, s = 1; s <= 8; s *= 2) for (var o = 1; o <= 8; o *= 2) for (var n = 1; n <= 8; n *= 2) for (var r = 1; r <= 8; r *= 2) if (15 == (s | o | n | r)) for (var c = 0; c <= 3; c++) for (var u = 0; u <= 3; u++) for (var d = 0; d <= 3; d++) {
            var l = this.oper(c, a[s], a[o]), f = this.oper(u, l, a[n]), h = (this.oper(d, f, a[r]), 
            this.oper(d, this.oper(u, this.oper(c, a[s], a[o]), a[n]), a[r]));
            Math.abs(h - 24) < 1e-5 && (i.value = i.value + "((" + a[s] + e[c] + a[o] + ")" + e[u] + a[n] + ")" + e[d] + a[r] + "|"), 
            h = this.oper(c, a[s], this.oper(d, this.oper(u, a[o], a[n]), a[r])), Math.abs(h - 24) < 1e-5 && (i.value = i.value + a[s] + e[c] + "((" + a[o] + e[u] + a[n] + ")" + e[d] + a[r] + ")|"), 
            h = this.oper(d, this.oper(c, a[s], this.oper(u, a[o], a[n])), a[r]), Math.abs(h - 24) < 1e-5 && (i.value = i.value + "(" + a[s] + e[c] + "(" + a[o] + e[u] + a[n] + "))" + e[d] + a[r] + "|"), 
            h = this.oper(c, a[s], this.oper(u, a[o], this.oper(d, a[n], a[r]))), Math.abs(h - 24) < 1e-5 && (i.value = i.value + a[s] + e[c] + "(" + a[o] + e[u] + "(" + a[n] + e[d] + a[r] + "))|"), 
            h = this.oper(u, this.oper(c, a[s], a[o]), this.oper(d, a[n], a[r])), Math.abs(h - 24) < 1e-5 && (i.value = i.value + "(" + a[s] + e[c] + a[o] + ")" + e[u] + "(" + a[n] + e[d] + a[r] + ")|");
        }
        return i;
    }
});