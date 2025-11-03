// 我的页面逻辑
import { userService } from '../../services/userService';

interface UserInfo {
  _id?: string;
  openid: string;
  nickname: string;
  avatar: string;
  gender?: number;
  city?: string;
  province?: string;
  country?: string;
  phone?: string;
  stats: {
    analysis: number;
  };
  createTime?: Date;
  updateTime?: Date;
}

Page({
  data: {
    isLoggedIn: false,
    userInfo: {
      _id: '',
      openid: '',
      nickname: '',
      avatar: '',
      stats: {
        analysis: 0
      }
    } as UserInfo
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
    const isLoggedIn = userService.isLoggedIn();
    const userInfo = userService.getCurrentUser();
    
    if (isLoggedIn && userInfo) {
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo
      });
    } else {
      this.setData({
        isLoggedIn: false
      });
    }
  },

  // 强制刷新用户信息
  async refreshUserInfo() {
    try {
      // 重新从本地存储获取最新的用户信息
      const userInfo = userService.getCurrentUser();
      
      if (userInfo) {
        console.log('刷新用户信息:', userInfo);
        
        // 强制更新页面数据
        this.setData({
          userInfo: userInfo
        });
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error);
      // 如果刷新失败，回退到原来的方法
      this.checkLoginStatus();
    }
  },

  // 头像点击
  onAvatarTap() {
    if (!this.data.isLoggedIn) {
      this.onLoginTap();
      return;
    }

    wx.showActionSheet({
      itemList: ['拍照', '从相册选择', '查看资料'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 拍照
          this.changeAvatarFromCamera();
        } else if (res.tapIndex === 1) {
          // 从相册选择
          this.changeAvatarFromAlbum();
        } else if (res.tapIndex === 2) {
          this.viewProfile();
        }
      }
    });
  },

  // 更换头像
  async changeAvatar() {
    try {
      const res = await new Promise<any>((resolve, reject) => {
        wx.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: resolve,
          fail: (error) => {
            // 如果是用户取消操作，不抛出错误
            if (error.errMsg && error.errMsg.includes('cancel')) {
              resolve(null); // 返回null表示用户取消
            } else {
              reject(error);
            }
          }
        });
      });

      // 如果用户取消了选择，直接返回
      if (!res || !res.tempFilePaths || res.tempFilePaths.length === 0) {
        return;
      }

      const tempFilePath = res.tempFilePaths[0];
      
      wx.showLoading({
        title: '上传中...'
      });

      const avatarUrl = await userService.uploadAvatarWithUserId(tempFilePath);
      
      wx.hideLoading();

      if (avatarUrl) {
        console.log('头像上传成功，新头像URL:', avatarUrl);
        
        wx.showToast({
          title: '头像上传成功',
          icon: 'success'
        });
        
        // 强制刷新用户信息
        await this.refreshUserInfo();
      } else {
        wx.showToast({
          title: '头像上传失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('更换头像失败:', error);
      
      // 根据错误类型显示不同的提示
      const errorMsg = (error as any).errMsg || '';
      if (errorMsg.includes('cancel')) {
        // 用户取消操作，不显示错误提示
        return;
      } else if (errorMsg.includes('permission')) {
        wx.showToast({
          title: '需要相机和相册权限',
          icon: 'none'
        });
      } else {
        wx.showToast({
          title: '头像上传失败',
          icon: 'none'
        });
      }
    }
  },

  // 从相机拍照更换头像
  async changeAvatarFromCamera() {
    await this.selectAndUploadAvatar(['camera']);
  },

  // 从相册选择更换头像
  async changeAvatarFromAlbum() {
    await this.selectAndUploadAvatar(['album']);
  },

  // 选择并上传头像的通用方法
  async selectAndUploadAvatar(sourceType: ('album' | 'camera')[]) {
    try {
      const res = await new Promise<any>((resolve, reject) => {
        wx.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: sourceType,
          success: resolve,
          fail: (error) => {
            // 如果是用户取消操作，不抛出错误
            if (error.errMsg && error.errMsg.includes('cancel')) {
              resolve(null); // 返回null表示用户取消
            } else {
              reject(error);
            }
          }
        });
      });

      // 如果用户取消了选择，直接返回
      if (!res || !res.tempFilePaths || res.tempFilePaths.length === 0) {
        return;
      }

      const tempFilePath = res.tempFilePaths[0];
      
      wx.showLoading({
        title: '上传中...'
      });

      const avatarUrl = await userService.uploadAvatarWithUserId(tempFilePath);
      
      wx.hideLoading();

      if (avatarUrl) {
        console.log('头像上传成功，新头像URL:', avatarUrl);
        
        wx.showToast({
          title: '头像上传成功',
          icon: 'success'
        });
        
        // 强制刷新用户信息
        await this.refreshUserInfo();
      } else {
        wx.showToast({
          title: '头像上传失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('更换头像失败:', error);
      
      // 根据错误类型显示不同的提示
      const errorMsg = (error as any).errMsg || '';
      if (errorMsg.includes('cancel')) {
        // 用户取消操作，不显示错误提示
        return;
      } else if (errorMsg.includes('permission')) {
        wx.showModal({
          title: '权限提示',
          content: '需要相机和相册权限才能更换头像，请在设置中开启权限',
          showCancel: false,
          confirmText: '知道了'
        });
      } else {
        wx.showToast({
          title: '头像上传失败',
          icon: 'none'
        });
      }
    }
  },

  // 编辑资料按钮点击
  onEditProfileTap() {
    if (!this.data.isLoggedIn) {
      this.onLoginTap();
      return;
    }

    wx.showActionSheet({
      itemList: ['拍照', '从相册选择', '编辑昵称', '查看资料'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 拍照
          this.changeAvatarFromCamera();
        } else if (res.tapIndex === 1) {
          // 从相册选择
          this.changeAvatarFromAlbum();
        } else if (res.tapIndex === 2) {
          this.editNickname();
        } else if (res.tapIndex === 3) {
          this.viewProfile();
        }
      }
    });
  },

  // 编辑昵称
  editNickname() {
    const currentNickname = this.data.userInfo.nickname || '';
    
    wx.showModal({
      title: '编辑昵称',
      editable: true,
      placeholderText: '请输入昵称',
      content: currentNickname,
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          const newNickname = res.content.trim();
          this.updateNickname(newNickname);
        }
      }
    });
  },

  // 更新昵称
  async updateNickname(nickname: string) {
    try {
      wx.showLoading({
        title: '更新中...'
      });

      const success = await userService.updateUserInfo({ nickname: nickname });
      
      wx.hideLoading();

      if (success) {
        wx.showToast({
          title: '昵称更新成功',
          icon: 'success'
        });
        
        // 强制刷新用户信息
        await this.refreshUserInfo();
      } else {
        wx.showToast({
          title: '昵称更新失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('更新昵称失败:', error);
      wx.showToast({
        title: '昵称更新失败',
        icon: 'none'
      });
    }
  },

  // 查看资料
  viewProfile() {
    wx.showToast({
      title: '查看资料功能开发中',
      icon: 'none'
    });
  },

  // 分析记录
  onAnalysisHistoryTap() {
    if (!this.data.isLoggedIn) {
      this.onLoginTap();
      return;
    }

    wx.navigateTo({
      url: '/pages/analysis-history/analysis-history'
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
          // 使用用户服务退出登录
          userService.logout();
          
          this.setData({
            isLoggedIn: false,
            userInfo: {
              _id: '',
              openid: '',
              nickname: '',
              avatar: '',
              stats: {
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
