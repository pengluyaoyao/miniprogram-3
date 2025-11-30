// 分享详情页面
Page({
  data: {
    shareTitle: '',
    houseInfo: {
      rooms: '',
      area: '',
      orientation: ''
    },
    highlights: [] as string[],
    analysisSummary: ''
  },

  onLoad(options: any) {
    console.log('分享详情页参数:', options);

    // 从URL参数中解析数据
    if (options.title) {
      this.setData({
        shareTitle: decodeURIComponent(options.title)
      });
    }

    // 户型信息
    const houseInfo: any = {};
    if (options.rooms) {
      houseInfo.rooms = decodeURIComponent(options.rooms);
    }
    if (options.area) {
      houseInfo.area = decodeURIComponent(options.area);
    }
    if (options.orientation) {
      houseInfo.orientation = decodeURIComponent(options.orientation);
    }
    
    this.setData({ houseInfo });

    // 亮点列表
    if (options.highlights) {
      try {
        const highlights = JSON.parse(decodeURIComponent(options.highlights));
        this.setData({ highlights });
      } catch (e) {
        console.error('解析亮点失败:', e);
      }
    }

    // 分析摘要
    if (options.summary) {
      this.setData({
        analysisSummary: decodeURIComponent(options.summary)
      });
    }
  },

  // 跳转到分析页面
  goToAnalysis() {
    wx.redirectTo({
      url: '/pages/analysis/analysis',
      fail: () => {
        wx.switchTab({
          url: '/pages/analysis/analysis'
        });
      }
    });
  },

  // 分享给好友
  onShareAppMessage() {
    return {
      title: this.data.shareTitle || '户型优化分析',
      path: `/pages/share-detail/share-detail?title=${encodeURIComponent(this.data.shareTitle)}`
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: this.data.shareTitle || '户型优化分析'
    };
  }
});

