var t = getApp();

Page({
    data: {
        tiku: {},
        screenHeight: 500,
        requestObj: {},
        stars: -1,
        score: "",
        score_fufenzhi: 100,
        maskStatus: "none",
        tixingTitle: "",
        timecost: 0,
        wrongNums: 0,
        configs: [ 80, 60, 40, 20, 20 ],
        showMask: !1,
        showNicknameDialog: !1,
        nickname: "",
        orginal_nickname: "",
        button_forecolor: "#4c4c4c",
        button_backcolor: "#f7f7f7",
        button_bordercolor: "#f7f7f7",
        nouse: 0
    },
    onLoad: function(a) {
        console.log(a);
        var e = JSON.parse(decodeURIComponent(a.tiku));
        this.data.tiku = e;
        var n = JSON.parse(a.wrongnums);
        this.setData({
            wrongNums: n
        });
        wx.getSystemInfoSync().windowHeight;
        var i = (a.timecost / 1e3).toFixed(1);
        this.setData({
            tixingTitle: this.data.tiku.xlname,
            timecost: i
        }), this.data.nickname = wx.getStorageSync("nickname");
        var o = t.globalData.unionId, s = "";
        s = 1 == t.globalData.localDebug ? t.globalData.local_url + "getrank?userid=" + o + "&xlid=" + e.xlid + "&timecost=" + a.timecost : t.globalData.server_bridge + "function=getrank&userid=" + o + "&xlid=" + e.xlid + "&timecost=" + a.timecost, 
        console.log("url=" + s);
        var c = this;
        wx.request({
            url: s,
            method: "GET",
            header: {
                "Content-Type": "application/json;charset=UTF-8"
            },
            success: function(a) {
                console.log(a.data);
                var e = a.data.data, n = t.fuFenZhi(e);
                c.data.score_fufenzhi = n;
                var i = t.score2stars(n), o = c.data.tiku.xlid;
                c.setData({
                    stars: i,
                    score: n + "%"
                }), t.updateLocalStars(o, i);
            }
        }), this.innerAudioContext = wx.createInnerAudioContext();
        this.innerAudioContext.src = "/pages/resource/success_end.mp3", this.innerAudioContext.play();
    },
    btntiku: function() {
        wx.redirectTo({
            url: "/pages/kousuanselect/kousuanselect"
        });
    },
    btnHome: function() {
        wx.switchTab({
            url: "/pages/index/index"
        });
    },
    btnagain: function() {
        var t = this.data.tiku, a = "/pages/timu2/" + t.page + "?tiku=" + encodeURIComponent(JSON.stringify(t)) + "&docid=" + -1;
        console.log(a), wx.navigateTo({
            url: a,
            success: function() {
                wx.setStorageSync("selection", "grade");
            }
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
        var a = t.detail.value;
        this.data.nickname = a;
        var e = "#4c4c4c", n = "#f7f7f7", i = "#f7f7f7";
        a != this.data.orginal_nickname && 0 != a.length && (e = "#fff", n = "#4eb460", 
        i = "#4eb460"), this.setData({
            button_forecolor: e,
            button_backcolor: n,
            button_bordercolor: i
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
        var a = t.globalData.miniprogramId, e = this.data.tiku.xlname, n = Math.floor(this.data.timecost), i = 10 * (10 - this.data.wrongNums), o = Math.ceil(this.data.score_fufenzhi), s = this.data.nickname, c = this.data.tiku, r = "/pages/jiangzhuang/jiangzhuang?nickname=" + s + "&xlname=" + e + "&timecost=" + n + "&score=" + i + "&rank=" + o + "&programid=" + a + "&fromshare=0&tiku=" + encodeURIComponent(JSON.stringify(c));
        console.log(r), wx.navigateTo({
            url: r,
            success: function() {}
        });
    },
    btnJiangZhuang: function() {
        0 != this.data.nickname.length ? this.jump2JiangZhuang() : this.setData({
            showMask: !0,
            showNicknameDialog: !0
        });
    },
    onShareAppMessage: function() {
        return {
            title: "口算天天练，进步看得见！",
            desc: "口算天天练，进步看得见！",
            imageUrl: "/img/share.jpg",
            path: "/pages/index/index"
        };
    }
});