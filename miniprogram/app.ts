// app.ts
App<IAppOption>({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    cloudEnv: 'cloud1-2grdaeu00966fc03'
  },
  
  onLaunch() {
    // 初始化云开发
    this.initCloud();

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 检查登录状态
    this.checkLoginStatus();

    // 微信登录获取code
    wx.login({
      success: res => {
        console.log('微信登录code:', res.code)
        // 保存code用于后续登录
        wx.setStorageSync('wxCode', res.code);
      },
    })
  },

  // 初始化云开发
  initCloud() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: this.globalData.cloudEnv,
        traceUser: true,
      })
      console.log('云开发初始化成功')
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
      this.globalData.isLoggedIn = true;
    }
  },

  // 设置用户信息
  setUserInfo(userInfo: any) {
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = true;
    wx.setStorageSync('userInfo', userInfo);
  },

  // 清除用户信息
  clearUserInfo() {
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    wx.removeStorageSync('userInfo');
  }
})