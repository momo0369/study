Page({
    data: {},
    onLoad: function(n) {
        this.innerAudioContext = wx.createInnerAudioContext();
        this.innerAudioContext.src = "/pages/resource/test.mp3", this.innerAudioContext.play(), 
        this.innerAudioContext.onEnded(function() {});
    },
    btnTest: function() {
        this.innerAudioContext.src = "/pages/resource/success.mp3", this.innerAudioContext.play();
    },
    onReady: function() {},
    onShow: function() {},
    onHide: function() {},
    onUnload: function() {},
    onPullDownRefresh: function() {},
    onReachBottom: function() {},
    onShareAppMessage: function() {}
});