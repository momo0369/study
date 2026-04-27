var t = getApp();

Page({
    data: {
        screenHeight: 500,
        requestObj: {},
        stars: -1,
        score: "",
        score_fufenzhi: 100,
        maskStatus: "none",
        tixingTitle: "",
        timecost: 0,
        configs: [],
        mode: 1,
        helprateSelectedId: 0,
        scopeSelectedId: 0,
        difficultyById: 1,
        itemid: 1,
        totalTimuNum: 5,
        showMask: !1,
        showNicknameDialog: !1,
        nickname: "",
        orginal_nickname: "",
        button_forecolor: "#4c4c4c",
        button_backcolor: "#f7f7f7",
        button_bordercolor: "#f7f7f7",
        nouse: 0
    },
    onLoad: function(e) {
        var a = JSON.parse(e.score), i = JSON.parse(e.timecost), n = t.fuFenZhi(a);
        this.data.score_fufenzhi = n;
        var o = t.score2stars(n);
        this.setData({
            stars: o,
            score: n.toFixed(0) + "%",
            timecost: (i / 1e3).toFixed(1)
        }), console.log(e);
        var s = JSON.parse(e.obj);
        console.log("obj的值:" + s), this.data.mode = s.mode, this.data.helprateSelectedId = s.helprateSelectedId, 
        this.data.scopeSelectedId = s.scopeSelectedId, this.data.itemid = s.itemid, this.data.difficultyById = s.difficultyById, 
        5 == s.mode && (this.data.mode = 1, this.difficultyById = 1, this.data.scopeSelectedId = 0), 
        this.innerAudioContext = wx.createInnerAudioContext();
        this.innerAudioContext.src = "/pages/resource/success_end.mp3", this.innerAudioContext.play();
    },
    onShow: function() {
        wx.hideHomeButton();
    },
    btnTiku: function() {
        wx.switchTab({
            url: "/pages/twentyfour/index"
        });
    },
    btnHome: function() {
        wx.switchTab({
            url: "/pages/index/index"
        });
    },
    btnagain: function() {
        var t = this.data.mode;
        5 == t && (t = 1);
        var e = {};
        e.mode = this.data.mode, e.helprateSelectedId = this.data.helprateSelectedId, e.scopeSelectedId = this.data.scopeSelectedId, 
        e.difficultyById = this.data.difficultyById, e.itemid = this.data.itemid;
        var a = "/pages/twentyfour/index?replay_flag=1&obj=" + JSON.stringify(e);
        console.log("从success跳转前的检查url=" + a), wx.navigateTo({
            url: a
        });
    },
    openRule: function() {
        this.setData({
            maskStatus: "block"
        });
    },
    closeMask: function() {
        this.setData({
            maskStatus: "none"
        });
    },
    preventTouchMove: function() {},
    handleChange: function(t) {
        var e = t.detail.value;
        this.data.nickname = e;
        var a = "#4c4c4c", i = "#f7f7f7", n = "#f7f7f7";
        e != this.data.orginal_nickname && 0 != e.length && (a = "#fff", i = "#4eb460", 
        n = "#4eb460"), this.setData({
            button_forecolor: a,
            button_backcolor: i,
            button_bordercolor: n
        });
    },
    btnConfirmNickname: function() {
        var t = "";
        0 == this.data.nickname.length ? (t = "请输入昵称", wx.showToast({
            title: t,
            icon: "success"
        })) : this.data.nickname != this.data.orginal_nickname && (t = "设置成功", wx.setStorageSync("nickname", this.data.nickname), 
        wx.showToast({
            title: t,
            duration: 500,
            icon: "success"
        }), this.setData({
            showNicknameDialog: !1,
            showMask: !1
        }), this.jump2JiangZhuang());
    },
    jump2JiangZhuang: function() {
        var e = t.globalData.miniprogramId, a = Math.floor(this.data.timecost), i = Math.ceil(this.data.score_fufenzhi), n = "/pages/jiangzhuang/jiangzhuang?nickname=" + this.data.nickname + "&xlname=24点&timecost=" + a + "&score=100&rank=" + i + "&programid=" + e + "&fromshare=0";
        console.log(n), wx.navigateTo({
            url: n,
            success: function() {}
        });
    },
    btnJiangZhuang: function() {
        var t = wx.getStorageSync("nickname");
        this.data.nickname = t, 0 != t.length ? this.jump2JiangZhuang() : this.setData({
            showMask: !0,
            showNicknameDialog: !0
        });
    },
    onShareAppMessage: function() {
        return {
            title: "24点",
            desc: "口算天天练，进步看得见！",
            path: "/pages/index/index"
        };
    }
});