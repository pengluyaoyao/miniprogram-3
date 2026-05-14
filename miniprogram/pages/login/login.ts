import { callCloud } from '../../utils/cloud'
import { isLoggedIn, logout, setLoggedIn, setLocalUserBrief } from '../../utils/auth'

Page({
  data: {
    redirect: '',
    alreadyLoggedIn: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    const raw = query.redirect
    const redirect = raw ? decodeURIComponent(raw) : ''
    this.setData({ redirect })
  },

  onShow() {
    this.setData({ alreadyLoggedIn: isLoggedIn() })
  },

  onContinueLoggedIn() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    const url = this.data.redirect || '/pages/home/home'
    wx.reLaunch({ url })
  },

  onLogoutFromLogin() {
    wx.showModal({
      title: '退出登录',
      content: '清除本机登录状态，可重新登录或重新触发系统定位授权弹窗（若系统曾拒绝，需到设置中打开）。',
      confirmText: '退出',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) {
          return
        }
        logout()
        this.setData({ alreadyLoggedIn: false })
        wx.showToast({ title: '已退出', icon: 'success' })
      },
    })
  },

  /** 拉取头像昵称后写入云库 users，再标记本地已登录 */
  onLoginTap() {
    wx.getUserProfile({
      desc: '用于展示个人资料与寄养信息服务',
      success: (res) => {
        const ui = res.userInfo
        wx.showLoading({ title: '登录中', mask: true })
        callCloud('upsertUser', {
            nickName: ui.nickName,
            avatarUrl: ui.avatarUrl,
            gender: ui.gender,
            country: ui.country,
            province: ui.province,
            city: ui.city,
            language: ui.language,
          }).then((cloudRes) => {
            wx.hideLoading()
            const result = cloudRes.result as
              | { ok: true; openid: string; nickname?: string; avatarUrl?: string }
              | { ok: false; errMsg?: string }
            if (result && result.ok && 'openid' in result) {
              setLoggedIn(true)
              setLocalUserBrief(result.openid, result.nickname || ui.nickName, result.avatarUrl || ui.avatarUrl)
              wx.showToast({ title: '已登录', icon: 'success', duration: 800 })
              this.finishNavigation()
            } else {
              wx.showToast({
                title: (result as { errMsg?: string }).errMsg || '同步用户失败',
                icon: 'none',
              })
            }
          })
          .catch((err: { errMsg?: string }) => {
            wx.hideLoading()
            wx.showToast({
              title: err.errMsg || '云函数 upsertUser 调用失败，请检查是否已上传部署',
              icon: 'none',
            })
          })
      },
      fail: () => {
        wx.showToast({ title: '需要授权头像昵称', icon: 'none' })
      },
    })
  },

  /** 开发者工具等场景 getUserProfile 不可用：仍写入 openid，资料字段可为空 */
  onLoginMinimalTap() {
    wx.showLoading({ title: '登录中', mask: true })
    callCloud('upsertUser', {})
      .then((cloudRes) => {
        wx.hideLoading()
        const result = cloudRes.result as
          | { ok: true; openid: string; nickname?: string; avatarUrl?: string }
          | { ok: false; errMsg?: string }
        if (result && result.ok && 'openid' in result) {
          setLoggedIn(true)
          setLocalUserBrief(result.openid, result.nickname || '', result.avatarUrl || '')
          wx.showToast({ title: '已登录(仅openid)', icon: 'none', duration: 900 })
          this.finishNavigation()
        } else {
          wx.showToast({
            title: (result as { errMsg?: string }).errMsg || '同步失败',
            icon: 'none',
          })
        }
      })
      .catch((err: { errMsg?: string }) => {
        wx.hideLoading()
        wx.showToast({ title: err.errMsg || '云函数失败', icon: 'none' })
      })
  },

  finishNavigation() {
    const canGoBack = getCurrentPages().length > 1
    setTimeout(() => {
      if (canGoBack) {
        wx.navigateBack()
        return
      }
      const url = this.data.redirect || '/pages/home/home'
      wx.reLaunch({ url })
    }, 600)
  },

  onSkipTap() {
    wx.navigateBack()
  },
})
