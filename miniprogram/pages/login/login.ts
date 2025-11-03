// 登录页面逻辑
import { userService } from '../../services/userService';

Page({
  data: {
    // 页面数据
  },

  onLoad() {
    // 页面加载
  },

  // 微信登录
  async onWechatLogin() {
    try {
      wx.showLoading({
        title: '登录中...'
      });

      const result = await userService.wechatLogin();

      wx.hideLoading();

      if (result.success) {
        wx.showToast({
          title: result.isNewUser ? '注册成功' : '登录成功',
          icon: 'success'
        });

        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.message || '登录失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('微信登录失败:', error);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
    }
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
