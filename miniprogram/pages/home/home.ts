// 首页逻辑
interface HouseItem {
  id: string;
  title: string;
  description: string;
  image: string;
  type: string;
  likes: number;
  comments: number;
  time: string;
}

Page({
  data: {
    houseList: [] as HouseItem[],
    loading: false,
    hasMore: true,
    page: 1,
    searchKeyword: ''
  },

  onLoad() {
    this.loadHouseList();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({
      page: 1,
      houseList: [],
      hasMore: true
    });
    this.loadHouseList().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadHouseList();
    }
  },

  // 加载户型列表
  async loadHouseList() {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      // 模拟API调用
      const mockData: HouseItem[] = [
        {
          id: '1',
          title: '南北通透三居室，财位布局优化建议',
          description: '根据您的生辰八字分析，建议将主卧床头朝向东南，客厅财位放置绿色植物...',
          image: 'https://via.placeholder.com/350x200/4f46e5/ffffff?text=户型图1',
          type: '三室两厅',
          likes: 128,
          comments: 23,
          time: '2小时前'
        },
        {
          id: '2',
          title: '小户型厨房风水布局，提升财运',
          description: '厨房位于西北角，建议调整灶台位置，避免水火相冲，同时增加收纳空间...',
          image: 'https://via.placeholder.com/350x200/059669/ffffff?text=户型图2',
          type: '两室一厅',
          likes: 89,
          comments: 15,
          time: '5小时前'
        },
        {
          id: '3',
          title: '复式楼楼梯位置对财运的影响分析',
          description: '楼梯正对大门，建议在楼梯口放置屏风或绿植化解，同时调整主卧位置...',
          image: 'https://via.placeholder.com/350x200/dc2626/ffffff?text=户型图3',
          type: '四室两厅',
          likes: 156,
          comments: 31,
          time: '1天前'
        }
      ];

      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newList = this.data.page === 1 ? mockData : [...this.data.houseList, ...mockData];
      
      this.setData({
        houseList: newList,
        page: this.data.page + 1,
        hasMore: this.data.page < 3 // 模拟只有3页数据
      });

    } catch (error) {
      console.error('加载户型列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 搜索变化
  onSearchChange(e: any) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  // 搜索提交
  onSearchSubmit(e: any) {
    const keyword = e.detail.value;
    console.log('搜索关键词:', keyword);
    
    // 这里可以实现搜索逻辑
    wx.showToast({
      title: `搜索: ${keyword}`,
      icon: 'none'
    });
  },

  // 卡片点击
  onCardTap(e: any) {
    const item = e.currentTarget.dataset.item;
    console.log('点击户型卡片:', item);
    
    // 跳转到详情页
    wx.navigateTo({
      url: `/pages/detail/detail?id=${item.id}&title=${encodeURIComponent(item.title)}`
    });
  }
});
