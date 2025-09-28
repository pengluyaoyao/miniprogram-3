// 登录页面逻辑
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

Page({
  data: {},

  onLoad() {
    // 页面加载
  },

  // 微信登录
  async onWechatLogin() {
    try {
      wx.showLoading({
        title: '登录中...'
      });

      // 获取用户信息
      const userProfile = await this.getUserProfile();
      
      // 模拟登录API调用
      await new Promise(resolve => setTimeout(resolve, 1500));

      const userInfo: UserInfo = {
        id: Date.now().toString(),
        nickname: userProfile.nickName || '风水爱好者',
        avatar: userProfile.avatarUrl || 'https://via.placeholder.com/160x160/0052d9/ffffff?text=头像',
        stats: {
          posts: 12,
          likes: 156,
          follows: 23,
          collections: 8,
          comments: 45,
          analysis: 12
        }
      };

      // 保存用户信息到本地存储
      wx.setStorageSync('userInfo', userInfo);

      wx.hideLoading();
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });

      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (error) {
      wx.hideLoading();
      console.error('微信登录失败:', error);
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      });
    }
  },

  // 获取用户信息
  getUserProfile(): Promise<any> {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          resolve(res.userInfo);
        },
        fail: (error) => {
          reject(error);
        }
      });
    });
  },

  // 手机号登录
  onPhoneLogin() {
    wx.showModal({
      title: '手机号登录',
      content: '手机号登录功能开发中，请使用微信登录',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 游客模式
  onGuestMode() {
    wx.showModal({
      title: '游客模式',
      content: '游客模式下功能受限，建议登录后使用完整功能',
      confirmText: '继续游客模式',
      cancelText: '去登录',
      success: (res) => {
        if (res.confirm) {
          // 游客模式，设置临时用户信息
          const guestInfo: UserInfo = {
            id: 'guest',
            nickname: '游客用户',
            avatar: 'https://via.placeholder.com/160x160/ccc/ffffff?text=游客',
            stats: {
              posts: 0,
              likes: 0,
              follows: 0,
              collections: 0,
              comments: 0,
              analysis: 0
            }
          };

          wx.setStorageSync('userInfo', guestInfo);
          
          wx.showToast({
            title: '游客模式已启用',
            icon: 'success'
          });

          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      }
    });
  },

  // 用户协议
  onUserAgreement() {
    wx.showModal({
      title: '用户协议',
      content: '这里是用户协议的内容...\n\n用户协议详细内容请查看完整版本。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 隐私政策
  onPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: '这里是隐私政策的内容...\n\n我们重视您的隐私，详细政策请查看完整版本。',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});
