App({
    onLaunch: function() {
        var e = this, t = wx.getStorageSync("openId"), i = wx.getStorageSync("unionId"), a = wx.getStorageSync("isWhiteUser");
        this.globalData.openId = t, this.globalData.unionId = i, this.globalData.isWhiteUser = a;
        var s = this;
        t && i || wx.login({
            success: function(t) {
                t.code ? wx.request({
                    url: e.globalData.server_root + "/getunionid.php?idno=" + e.globalData.miniprogramId + "&code=" + t.code,
                    success: function(e) {
                        console.log("getuniond调用成功!"), console.log(e.data), s.globalData.openId = e.data.openid, 
                        s.globalData.unionId = e.data.unionid, wx.setStorageSync("openId", e.data.openid), 
                        wx.setStorageSync("unionId", e.data.unionid);
                    }
                }) : console.log("登录失败！" + t.errMsg);
            }
        }), this.setAudioOn();
    },
    globalData: {
        miniprogramId: 1,
        localDebug: 0,
        debugMode: !1,
        userInfo: null,
        openId: "",
        unionId: "",
        isWhiteUser: 0,
        downloadlink: "",
        timu_feedback: "1/2-1/3=1/6",
        sharetitle: "提高您的口算能力！",
        sharebgimgurl: "https://www.xiaoxuestudy.com/kousuan_v1/image/24share.jpg",
        server_bridge: "https://www.xiaoxuestudy.com/kousuan_v2/bridge.php?",
        server_url: "https://www.xiaoxuestudy.com/kousuan_v1",
        local_url: "http://localhost:8888/kousuan_v2/",
        server_root: "https://www.xiaoxuestudy.com",
        local_root: "http://192.168.3.53:8888",
        selectById: 1,
        selectedId: 0,
        local_stars: [],
        stars_arr: [],
        tikuVersionIsChanged: !1,
        printviewVersionIsChanged: !1,
        showHongdian: 1,
        nouse: 0
    },
    setTimuStyle: function(e, t, i) {
        for (var a = 0; a < t.length; a++) {
            var s = parseInt(t[a].timu), n = parseInt(t[a].daan), r = t[a].timu, u = t[a].daan;
            if (142 == e || 143 == e) {
                var o = "";
                o = s % n != 0 ? Math.floor(s / n) + "······" + s % n : s / n;
                var l = "( )÷" + t[a].daan + "=" + o;
                t[a].timu = l, t[a].daan = s.toString();
            } else if (20 == e) {
                l = s + "+?=100";
                t[a].timu = l;
            } else if (22 == e) {
                l = s + "+?=1000";
                t[a].timu = l;
            } else if (148 == e) {
                l = s + "+?=10";
                t[a].timu = l;
            } else if (81 == e) r = r.replace("|", "和"), r += "的最大公因数是(  )", t[a].timu = r; else if (82 == e) r = r.replace("|", "和"), 
            r += "的最小公倍数是(  )", t[a].timu = r; else if (83 == e) r = r.replace("|", "和"), r += "的最大公因数和最小公倍数分别是(  )······(  )", 
            t[a].timu = r; else if (84 == e) {
                l = (c = r.split("|").map(Number))[0] + "，" + c[1] + "和" + c[2] + "的最小公倍数是(  )";
                t[a].timu = l;
            } else if (122 == e) {
                l = (c = r.split("|").map(Number))[0] + "，" + c[1] + "和" + c[2] + "的最大公因数是(  )";
                t[a].timu = l;
            } else if (123 == e) {
                var c;
                l = (c = r.split("|").map(Number))[0] + "，" + c[1] + "和" + c[2] + "的最大公因数和最小公倍数分别是(  )······(  )";
                t[a].timu = l;
            } else 90 == e || 124 == e || 125 == e || 97 == e || (92 == e ? (r += "=?", t[a].timu = r) : 93 == e ? (r = (r = r.replace(/\*/g, "×")).replace(/c/g, "÷"), 
            r += "=?", t[a].timu = r) : -1 != i.indexOf("fenshu") || -1 != i.indexOf("timu-jiefangcheng") || (e >= 98 && e <= 107 ? (103 == e && (u = u.replace("千米", "公里")), 
            104 == e && (u = u.replace("平方千米", "平方公里")), 105 == e && (u = (u = u.replace("升", "立方分米")).replace("毫升", "立方厘米")), 
            106 == e && (u = u.replace("公斤", "千克")), t[a].standardized_daan = u) : (r += "?", 
            t[a].timu = r)));
        }
        return t;
    },
    getStarsArr: function(e) {
        for (var t = [], i = 0; i < e.length; i++) {
            var a = e[i], s = {
                xlid: a,
                stars: this.getStarsFromLocal(a)
            };
            t.push(s);
        }
        return t;
    },
    updateLocalStars: function(e, t) {
        for (var i = this.globalData.local_stars, a = 0, s = 0; s < i.length; s++) if (e == i[s].xlid) {
            a = 1, i[s].stars = t;
            break;
        }
        if (1 != a) {
            var n = {
                xlid: e,
                stars: t
            };
            i.push(n);
        }
        wx.setStorageSync("local_stars", i);
    },
    getStarsFromLocal: function(e) {
        for (var t = 0, i = this.globalData.local_stars, a = 0; a < i.length; a++) if (e == i[a].xlid) {
            t = i[a].stars;
            break;
        }
        return t;
    },
    score2stars: function(e) {
        return e >= 80 ? 5 : e >= 60 && e < 80 ? 4 : e >= 40 && e < 60 ? 3 : e >= 20 && e < 40 ? 2 : 1;
    },
    fuFenZhi: function(e) {
        return e < 60 ? e += 20 : e < 80 && e >= 60 ? e = 80 + (e - 60) / 2 : e < 90 && e >= 80 ? e = 90 + (e - 80) / 2 : e < 95 && e >= 90 ? e = 95 + (e - 90) / 2 : e >= 95 && (e = 100), 
        e;
    },
    getRealPage: function(e) {
        var t = "timu";
        return e >= 103 && e <= 107 ? t = "timu-danweixuanze" : 80 == e || 89 == e ? t = "timu-bijiaodaxiao" : 90 == e || 93 == e ? t = "timu-percent" : e >= 73 && e <= 79 || e >= 85 && e <= 88 || 96 == e || 94 == e ? t = "timu-fenshu" : 97 == e && (t = "timu-jiefangcheng"), 
        t;
    },
    parseNumber: function(e, t) {
        var i = e.trim();
        return 0 == i.indexOf("(") && (t.pre = "(", i = i.substring(1)), i.indexOf(")") > 0 && (t.tail = ")", 
        i = i.substring(0, i.length - 1)), isNaN(i), i;
    },
    buildFenshuExpre: function(e, t) {
        var i = e;
        i = (i = (i = (i = i.replace(/u/g, "U")).replace(/c/g, "÷")).replace(/C/g, "÷")).replace(/\*/g, "×");
        for (var a = -1, s = 1, n = [], r = ""; a++ < i.length; ) {
            var u = i.charAt(a);
            if ("+" == u || "-" == u || "×" == u || "÷" == u || 1 == t && "=" == u) {
                var o, l, c;
                if (n[o = ++s - 2] = {}, (l = n[o]).exp = r, (c = r.split("U")).length > 1) {
                    l.fenshu = 1, l.int = this.parseNumber(c[0], l);
                    var p = c[1].split("/");
                    l.fenzi = this.parseNumber(p[0], l), l.fenmu = this.parseNumber(p[1], l);
                } else {
                    if (-1 == r.indexOf("/")) l.fenshu = -1, l.int = this.parseNumber(r, l); else {
                        l.fenshu = 1, l.int = -1;
                        p = r.split("/");
                        l.fenzi = this.parseNumber(p[0], l), l.fenmu = this.parseNumber(p[1], l);
                    }
                }
                l.sign = u, r = "";
            } else r += u;
        }
        if (n[o = s - 1] = {}, (l = n[o]).exp = r, (c = r.split("U")).length > 1) {
            l.fenshu = 1, l.int = this.parseNumber(c[0], l);
            p = c[1].split("/");
            l.fenzi = this.parseNumber(p[0], l), l.fenmu = this.parseNumber(p[1], l);
        } else {
            if (-1 == r.indexOf("/")) l.fenshu = -1, l.int = this.parseNumber(r, l); else {
                l.fenshu = 1, l.int = -1;
                p = r.split("/");
                l.fenzi = this.parseNumber(p[0], l), l.fenmu = this.parseNumber(p[1], l);
            }
        }
        return l.sign = u, n;
    },
    setAudioOn: function() {
        wx.setInnerAudioOption({
            obeyMuteSwitch: !1,
            success: function(e) {
                console.log("开启静音模式下播放音乐的功能");
            },
            fail: function(e) {
                console.log("静音设置失败");
            }
        });
    },
    nouse: function() {}
});