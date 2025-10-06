// 用户服务类
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
    posts: number;
    likes: number;
    follows: number;
    collections: number;
    comments: number;
    analysis: number;
  };
  createTime?: Date;
  updateTime?: Date;
}

interface LoginResult {
  success: boolean;
  userInfo?: UserInfo;
  isNewUser?: boolean;
  message?: string;
}

class UserService {
  private db = wx.cloud.database();
  private usersCollection = this.db.collection('users');

  // 微信登录
  async wechatLogin(): Promise<LoginResult> {
    try {
      // 获取用户信息
      const userProfile = await this.getUserProfile();
      
      // 调用云函数进行登录
      const result = await wx.cloud.callFunction({
        name: 'userLogin',
        data: {
          userProfile: userProfile,
          code: wx.getStorageSync('wxCode')
        }
      });

      if (result.result && result.result.success) {
        const userInfo = result.result.userInfo as UserInfo;
        
        // 保存用户信息到本地
        wx.setStorageSync('userInfo', userInfo);
        wx.setStorageSync('isLoggedIn', true);

        return {
          success: true,
          userInfo: userInfo,
          isNewUser: result.result.isNewUser
        };
      } else {
        return {
          success: false,
          message: result.result?.message || '登录失败'
        };
      }
    } catch (error) {
      console.error('微信登录失败:', error);
      return {
        success: false,
        message: '登录失败，请重试'
      };
    }
  }


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
  }


  // 更新用户信息
  async updateUserInfo(userInfo: Partial<UserInfo>): Promise<boolean> {
    try {
      const currentUser = wx.getStorageSync('userInfo');
      if (!currentUser) {
        throw new Error('用户未登录');
      }

      const result = await wx.cloud.callFunction({
        name: 'updateUserInfo',
        data: {
          userId: currentUser._id,
          userInfo: userInfo
        }
      });

      if (result.result && result.result.success) {
        // 更新本地用户信息
        const updatedUser = { ...currentUser, ...userInfo };
        console.log('更新用户信息到本地存储:', updatedUser);
        wx.setStorageSync('userInfo', updatedUser);
        
        // 验证存储是否成功
        const storedUser = wx.getStorageSync('userInfo');
        console.log('验证本地存储:', storedUser);
        
        return true;
      } else {
        throw new Error(result.result?.message || '更新失败');
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      return false;
    }
  }

  // 上传头像
  async uploadAvatar(filePath: string): Promise<string | null> {
    try {
      // 上传文件到云存储
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: `avatars/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`,
        filePath: filePath,
      });

      if (uploadResult.fileID) {
        // 更新用户头像
        const success = await this.updateUserInfo({ avatar: uploadResult.fileID });
        return success ? uploadResult.fileID : null;
      } else {
        throw new Error('上传失败');
      }
    } catch (error) {
      console.error('上传头像失败:', error);
      return null;
    }
  }

  // 使用用户ID上传头像
  async uploadAvatarWithUserId(filePath: string): Promise<string | null> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        throw new Error('用户未登录');
      }

      const userId = currentUser._id || currentUser.openid;
      const timestamp = Date.now();
      const fileExtension = filePath.split('.').pop() || 'jpg';
      
      // 使用用户ID作为文件名，格式：avatars/{userId}_{timestamp}.{extension}
      const cloudPath = `avatars/${userId}_${timestamp}.${fileExtension}`;

      // 保存旧头像URL，用于后续删除
      const oldAvatarUrl = currentUser.avatar;

      // 上传文件到云存储
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath,
      });

      if (uploadResult.fileID) {
        // 更新用户头像
        const success = await this.updateUserInfo({ avatar: uploadResult.fileID });
        
        if (success) {
          // 删除旧头像（异步执行，不影响主流程）
          if (oldAvatarUrl && oldAvatarUrl.startsWith('cloud://')) {
            this.deleteOldAvatar(oldAvatarUrl).catch(error => {
              console.warn('删除旧头像失败，但不影响头像上传:', error);
              // 删除旧头像失败不影响主要功能，只是会在云存储中留下旧文件
            });
          }
          
          return uploadResult.fileID;
        } else {
          return null;
        }
      } else {
        throw new Error('上传失败');
      }
    } catch (error) {
      console.error('上传头像失败:', error);
      return null;
    }
  }

  // 删除旧头像
  async deleteOldAvatar(oldAvatarUrl: string): Promise<boolean> {
    try {
      const result = await wx.cloud.callFunction({
        name: 'deleteOldAvatar',
        data: {
          oldAvatarUrl: oldAvatarUrl
        }
      });

      return result.result && result.result.success;
    } catch (error) {
      console.error('删除旧头像失败:', error);
      
      // 如果是函数不存在的错误，说明云函数没有部署
      const errorMsg = (error as any).errMsg || '';
      if (errorMsg.includes('FUNCTION_NOT_FOUND') || errorMsg.includes('-501000')) {
        console.warn('deleteOldAvatar云函数未部署，跳过删除旧头像');
        return false;
      }
      
      return false;
    }
  }

  // 退出登录
  logout() {
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('isLoggedIn');
    wx.removeStorageSync('wxCode');
  }

  // 获取当前用户信息
  getCurrentUser(): UserInfo | null {
    return wx.getStorageSync('userInfo') || null;
  }

  // 检查是否已登录
  isLoggedIn(): boolean {
    return wx.getStorageSync('isLoggedIn') === true;
  }

  // 更新用户统计信息
  async updateUserStats(stats: Partial<UserInfo['stats']>): Promise<boolean> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        throw new Error('用户未登录');
      }

      const result = await wx.cloud.callFunction({
        name: 'updateUserStats',
        data: {
          userId: currentUser._id,
          stats: stats
        }
      });

      if (result.result && result.result.success) {
        // 更新本地统计信息
        const updatedStats = { ...currentUser.stats, ...stats };
        const updatedUser = { ...currentUser, stats: updatedStats };
        wx.setStorageSync('userInfo', updatedUser);
        return true;
      } else {
        throw new Error(result.result?.message || '更新统计信息失败');
      }
    } catch (error) {
      console.error('更新用户统计信息失败:', error);
      return false;
    }
  }
}

// 导出单例
export const userService = new UserService();
