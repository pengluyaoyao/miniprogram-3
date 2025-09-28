// 我的页面逻辑
interface UserInfo {
  id: string;
  nickname: string;
  avatar: string;
  stats: {
    posts: number;
    likes: number;
    follows: number;
    collections: number;
    comments: number;
    analysis: number;
  };
}

interface MessageCount {
  system: number;
  comments: number;
  likes: number;
}

Page({
  data: {
    isLoggedIn: false,
    userInfo: {
      id: '',
      nickname: '',
      avatar: '',
      stats: {
        posts: 0,
        likes: 0,
        follows: 0,
        collections: 0,
        comments: 0,
        analysis: 0
      }
    } as UserInfo,
    messageCount: {
      system: 0,
      comments: 0,
      likes: 0
    } as MessageCount
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    // 每次显示页面时检查登录状态
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    const isLoggedIn = !!userInfo;
    
    if (isLoggedIn) {
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo
      });
      this.loadMessageCount();
    } else {
      this.setData({
        isLoggedIn: false
      });
    }
  },

  // 加载消息数量
  async loadMessageCount() {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockMessageCount: MessageCount = {
        system: 3,
        comments: 0,
        likes: 5
      };

      this.setData({
        messageCount: mockMessageCount
      });

    } catch (error) {
      console.error('加载消息数量失败:', error);
    }
  },

  // 头像点击
  onAvatarTap() {
    if (!this.data.isLoggedIn) {
      this.onLoginTap();
      return;
    }

    wx.showActionSheet({
      itemList: ['更换头像', '查看资料'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.changeAvatar();
        } else if (res.tapIndex === 1) {
          this.viewProfile();
        }
      }
    });
  },

  // 更换头像
  changeAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        // 这里可以上传头像到服务器
        wx.showToast({
          title: '头像上传成功',
          icon: 'success'
        });
      }
    });
  },

  // 查看资料
  viewProfile() {
    wx.showToast({
      title: '查看资料功能开发中',
      icon: 'none'
    });
  },

  // 我的发布
  onMyPostsTap() {
    if (!this.data.isLoggedIn) {
      this.onLoginTap();
      return;
    }

    wx.showToast({
      title: '我的发布',
      icon: 'none'
    });
  },

  // 我的收藏
  onMyCollectionsTap() {
    if (!this.data.isLoggedIn) {
      this.onLoginTap();
      return;
    }

    wx.showToast({
      title: '我的收藏',
      icon: 'none'
    });
  },

  // 我的评论
  onMyCommentsTap() {
    if (!this.data.isLoggedIn) {
      this.onLoginTap();
      return;
    }

    wx.showToast({
      title: '我的评论',
      icon: 'none'
    });
  },

  // 分析记录
  onAnalysisHistoryTap() {
    if (!this.data.isLoggedIn) {
      this.onLoginTap();
      return;
    }

    wx.showToast({
      title: '分析记录',
      icon: 'none'
    });
  },

  // 系统通知
  onSystemNotificationTap() {
    if (!this.data.isLoggedIn) {
      this.onLoginTap();
      return;
    }

    // 清除未读消息数量
    this.setData({
      'messageCount.system': 0
    });

    wx.showToast({
      title: '系统通知',
      icon: 'none'
    });
  },

  // 评论回复
  onCommentReplyTap() {
    if (!this.data.isLoggedIn) {
      this.onLoginTap();
      return;
    }

    wx.showToast({
      title: '评论回复',
      icon: 'none'
    });
  },

  // 点赞通知
  onLikeNotificationTap() {
    if (!this.data.isLoggedIn) {
      this.onLoginTap();
      return;
    }

    // 清除未读消息数量
    this.setData({
      'messageCount.likes': 0
    });

    wx.showToast({
      title: '点赞通知',
      icon: 'none'
    });
  },

  // 账户设置
  onAccountSettingsTap() {
    if (!this.data.isLoggedIn) {
      this.onLoginTap();
      return;
    }

    wx.showToast({
      title: '账户设置',
      icon: 'none'
    });
  },

  // 隐私设置
  onPrivacySettingsTap() {
    if (!this.data.isLoggedIn) {
      this.onLoginTap();
      return;
    }

    wx.showToast({
      title: '隐私设置',
      icon: 'none'
    });
  },

  // 关于我们
  onAboutTap() {
    wx.showModal({
      title: '关于我们',
      content: '风水户型分析 v1.0.0\n\n专业的AI风水分析平台，为您提供个性化的风水布局建议。',
      showCancel: false
    });
  },

  // 登录
  onLoginTap() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  // 退出登录
  onLogoutTap() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储的用户信息
          wx.removeStorageSync('userInfo');
          
          this.setData({
            isLoggedIn: false,
            userInfo: {
              id: '',
              nickname: '',
              avatar: '',
              stats: {
                posts: 0,
                likes: 0,
                follows: 0,
                collections: 0,
                comments: 0,
                analysis: 0
              }
            }
          });

          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  }
});
