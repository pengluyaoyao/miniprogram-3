import { getLocalUserBrief, isLoggedIn, logout } from '../../utils/auth'
import { refreshMessageBadge } from '../../utils/inboxBadge'

const MY_REDIRECT = '/pages/my/my'

Page({
  data: {
    loggedIn: false,
    userNickname: '',
    userOpenidSuffix: '',
    msgUnread: 0,
  },

  onShow() {
    const loggedIn = isLoggedIn()
    const brief = getLocalUserBrief()
    this.setData({
      loggedIn,
      userNickname: brief.nickname || '微信用户',
      userOpenidSuffix: brief.openid ? String(brief.openid).slice(-8) : '',
    })
    refreshMessageBadge(this)
  },

  goLogin() {
    wx.navigateTo({
      url: `/pages/login/login?redirect=${encodeURIComponent(MY_REDIRECT)}`
    })
  },

  goHome() {
    wx.reLaunch({ url: '/pages/home/home' })
  },
  goPublish() {
    wx.reLaunch({ url: '/pages/publish/publish' })
  },
  goMy() {
    // Current page
  },
  goMap() {
    wx.reLaunch({ url: '/pages/map/map' })
  },

  goInbox() {
    if (!isLoggedIn()) {
      wx.navigateTo({
        url: `/pages/login/login?redirect=${encodeURIComponent('/pages/inbox/inbox')}`,
      })
      return
    }
    wx.navigateTo({ url: '/pages/inbox/inbox' })
  },

  goMyRequests() {
    const path = '/pages/my-requests/my-requests'
    if (!isLoggedIn()) {
      wx.navigateTo({ url: `/pages/login/login?redirect=${encodeURIComponent(path)}` })
      return
    }
    wx.navigateTo({ url: path })
  },

  goMyContacts() {
    const path = '/pages/my-contacts/my-contacts'
    if (!isLoggedIn()) {
      wx.navigateTo({ url: `/pages/login/login?redirect=${encodeURIComponent(path)}` })
      return
    }
    wx.navigateTo({ url: path })
  },

  goMyFavorites() {
    const path = '/pages/my-favorites/my-favorites'
    if (!isLoggedIn()) {
      wx.navigateTo({ url: `/pages/login/login?redirect=${encodeURIComponent(path)}` })
      return
    }
    wx.navigateTo({ url: path })
  },

  goMyReports() {
    const path = '/pages/my-reports/my-reports'
    if (!isLoggedIn()) {
      wx.navigateTo({ url: `/pages/login/login?redirect=${encodeURIComponent(path)}` })
      return
    }
    wx.navigateTo({ url: path })
  },

  goMyPets() {
    wx.showToast({ title: '宠物档案功能开发中', icon: 'none' })
  },

  goSettings() {
    wx.showToast({ title: '设置功能开发中', icon: 'none' })
  },

  onLogoutTap() {
    wx.showModal({
      title: '退出登录',
      content: '将清除本机登录信息。退出后可重新登录，或便于调试地理位置授权等流程。',
      confirmText: '退出',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) {
          return
        }
        logout()
        this.setData({
          loggedIn: false,
          userNickname: '',
          userOpenidSuffix: '',
        })
        wx.showToast({ title: '已退出登录', icon: 'success' })
      },
    })
  },
})
