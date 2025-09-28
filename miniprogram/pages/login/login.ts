// 登录页面逻辑
import { userService } from '../../services/userService';

Page({
  data: {
    showPhoneForm: false,
    phoneNumber: '',
    smsCode: '',
    smsCodeSent: false,
    countdown: 0,
    countdownTimer: null as any
  },

  onLoad() {
    // 页面加载
  },

  onUnload() {
    // 清除倒计时
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
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

  // 手机号登录按钮点击
  onPhoneLogin() {
    this.setData({
      showPhoneForm: !this.data.showPhoneForm
    });
  },

  // 执行手机号登录
  async doPhoneLogin() {
    try {
      wx.showLoading({
        title: '登录中...'
      });

      const { phoneNumber, smsCode } = this.data;
      
      if (!phoneNumber || !smsCode) {
        wx.hideLoading();
        wx.showToast({
          title: '请填写手机号和验证码',
          icon: 'none'
        });
        return;
      }

      const result = await userService.phoneLogin(phoneNumber, smsCode);

      wx.hideLoading();

      if (result.success) {
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });

        // 清空表单
        this.setData({
          phoneNumber: '',
          smsCode: '',
          smsCodeSent: false
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
      console.error('手机号登录失败:', error);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
    }
  },

  // 获取手机号
  async onGetPhoneNumber(e: any) {
    if (e.detail.code) {
      try {
        wx.showLoading({
          title: '获取中...'
        });

        const phoneNumber = await userService.getPhoneNumber(e);
        
        wx.hideLoading();

        if (phoneNumber) {
          this.setData({
            phoneNumber: phoneNumber
          });
          wx.showToast({
            title: '获取手机号成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: '获取手机号失败',
            icon: 'none'
          });
        }
      } catch (error) {
        wx.hideLoading();
        console.error('获取手机号失败:', error);
        wx.showToast({
          title: '获取手机号失败',
          icon: 'none'
        });
      }
    }
  },

  // 发送短信验证码
  async sendSmsCode() {
    const { phoneNumber } = this.data;
    
    if (!phoneNumber) {
      wx.showToast({
        title: '请先获取手机号',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({
        title: '发送中...'
      });

      const success = await userService.sendSmsCode(phoneNumber);
      
      wx.hideLoading();

      if (success) {
        wx.showToast({
          title: '验证码已发送',
          icon: 'success'
        });

        // 开始倒计时
        this.startCountdown();
      } else {
        wx.showToast({
          title: '发送失败，请重试',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('发送短信验证码失败:', error);
      wx.showToast({
        title: '发送失败，请重试',
        icon: 'none'
      });
    }
  },

  // 开始倒计时
  startCountdown() {
    this.setData({
      smsCodeSent: true,
      countdown: 60
    });

    const timer = setInterval(() => {
      const countdown = this.data.countdown - 1;
      if (countdown <= 0) {
        clearInterval(timer);
        this.setData({
          smsCodeSent: false,
          countdown: 0,
          countdownTimer: null
        });
      } else {
        this.setData({
          countdown: countdown
        });
      }
    }, 1000);

    this.setData({
      countdownTimer: timer
    });
  },

  // 手机号输入
  onPhoneInput(e: any) {
    this.setData({
      phoneNumber: e.detail.value
    });
  },

  // 验证码输入
  onCodeInput(e: any) {
    this.setData({
      smsCode: e.detail.value
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
