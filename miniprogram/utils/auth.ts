/** 本地登录态；用户档案由云函数 upsertUser 写入 users 集合 */
const STORAGE_KEY = 'userLoggedIn'
const STORAGE_OPENID = 'openid'
const STORAGE_NICKNAME = 'nickname'
const STORAGE_AVATAR = 'avatarUrl'

export function isLoggedIn(): boolean {
  return !!wx.getStorageSync(STORAGE_KEY)
}

export function setLoggedIn(value: boolean) {
  if (value) {
    wx.setStorageSync(STORAGE_KEY, true)
  } else {
    wx.removeStorageSync(STORAGE_KEY)
    wx.removeStorageSync(STORAGE_OPENID)
    wx.removeStorageSync(STORAGE_NICKNAME)
    wx.removeStorageSync(STORAGE_AVATAR)
  }
}

/** 清除本机登录态（openid / 昵称等），便于切换账号或调试 */
export function logout() {
  setLoggedIn(false)
}

/** 登录成功后由登录页写入，供「我的」等页展示 */
export function setLocalUserBrief(openid: string, nickname: string, avatarUrl: string) {
  wx.setStorageSync(STORAGE_OPENID, openid)
  wx.setStorageSync(STORAGE_NICKNAME, nickname || '')
  wx.setStorageSync(STORAGE_AVATAR, avatarUrl || '')
}

export function getLocalUserBrief(): {
  openid: string
  nickname: string
  avatarUrl: string
} {
  return {
    openid: wx.getStorageSync(STORAGE_OPENID) || '',
    nickname: wx.getStorageSync(STORAGE_NICKNAME) || '',
    avatarUrl: wx.getStorageSync(STORAGE_AVATAR) || '',
  }
}

/**
 * 未登录则跳转登录页，登录成功后可返回 redirect 对应页面
 * @returns 已登录为 true
 */
export function ensureLoggedIn(redirectPath: string): boolean {
  if (isLoggedIn()) {
    return true
  }
  wx.navigateTo({
    url: `/pages/login/login?redirect=${encodeURIComponent(redirectPath)}`
  })
  return false
}
