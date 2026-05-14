// app.ts
import { CLOUD_ENV_ID } from './constants/cloudEnv'
import { refreshAllMessageBadges } from './utils/inboxBadge'

App<IAppOption>({
  globalData: {},
  onShow() {
    refreshAllMessageBadges().catch(() => {})
  },
  onLaunch() {
    wx.cloud.init({
      env: CLOUD_ENV_ID,
      traceUser: true,
    })

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        console.log(res.code)
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      },
    })
  },
})