// 分析记录页面
interface AnalysisRecord {
  _id: string;
  imageUrl: string;
  houseInfo: any;
  analysisResult: {
    summary: string;
    overallScore: number;
    aspects: any[];
  };
  status: string;
  createTime: Date;
  updateTime: Date;
}

Page({
  data: {
    records: [] as AnalysisRecord[],
    loading: true,
    isEmpty: false
  },

  onLoad() {
    this.loadAnalysisHistory();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadAnalysisHistory();
  },

  // 加载分析历史记录
  async loadAnalysisHistory() {
    try {
      this.setData({ loading: true });

      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo || !userInfo._id) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        return;
      }

      console.log('查询用户分析记录，userId:', userInfo._id);

      // 调用云函数查询历史记录
      const result = await wx.cloud.callFunction({
        name: 'getAnalysisHistory',
        data: {
          userId: userInfo._id
        }
      });

      console.log('历史记录查询结果:', result);

      if (result.result && result.result.success) {
        const records = result.result.records || [];
        
        // 只显示已完成的记录
        const completedRecords = records.filter((record: AnalysisRecord) => 
          record.status === 'completed' && record.analysisResult
        );

        console.log('已完成的记录数:', completedRecords.length);

        this.setData({
          records: completedRecords,
          isEmpty: completedRecords.length === 0,
          loading: false
        });
      } else {
        throw new Error(result.result?.message || '查询失败');
      }

    } catch (error) {
      console.error('加载分析历史失败:', error);
      this.setData({ 
        loading: false,
        isEmpty: true
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 查看分析详情
  onRecordTap(e: any) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.records.find(r => r._id === id);
    
    if (!record) {
      return;
    }

    console.log('查看记录详情:', record);

    // 跳转到详情页面（可以复用 detail 页面或创建新页面）
    wx.navigateTo({
      url: `/pages/analysis-history/detail?id=${id}`
    });
  },

  // 删除记录
  onDeleteRecord(e: any) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条分析记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' });

            const result = await wx.cloud.callFunction({
              name: 'deleteAnalysisRecord',
              data: {
                recordId: id
              }
            });

            wx.hideLoading();

            if (result.result && result.result.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              
              // 刷新列表
              this.loadAnalysisHistory();
            } else {
              throw new Error(result.result?.message || '删除失败');
            }

          } catch (error) {
            wx.hideLoading();
            console.error('删除记录失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 格式化时间
  formatTime(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadAnalysisHistory().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});

