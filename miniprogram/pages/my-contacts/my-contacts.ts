import { callCloud } from '../../utils/cloud'
import { ensureLoggedIn, isLoggedIn } from '../../utils/auth'
import { formatCloudTime } from '../../utils/formatTime'

const REDIRECT = '/pages/my-contacts/my-contacts'

type ThreadRow = {
  _id: string
  listing_id: string
  listing_title_cache: string
  listing_type: string
  last_message_body: string
  last_message_at?: unknown
  unread: number
  other_openid_tail: string
  timeLabel: string
}

Page({
  data: {
    threads: [] as ThreadRow[],
    loading: true,
    empty: false,
    needLogin: false,
  },

  onShow() {
    if (!isLoggedIn()) {
      this.setData({ loading: false, threads: [], empty: true, needLogin: true })
      return
    }
    this.setData({ needLogin: false })
    this.loadThreads()
  },

  loadThreads() {
    this.setData({ loading: true })
    callCloud('chatInbox')
      .then((res) => {
        const r = res.result as { ok?: boolean; threads?: ThreadRow[] }
        const list = (r && r.ok && r.threads) || []
        const threads = list.map((t) => ({
          ...t,
          timeLabel: formatCloudTime(t.last_message_at),
        }))
        this.setData({
          threads,
          empty: threads.length === 0,
          loading: false,
        })
      })
      .catch(() => {
        this.setData({ threads: [], empty: true, loading: false })
      })
  },

  openThread(e: WechatMiniprogram.BaseEvent) {
    if (!ensureLoggedIn(REDIRECT)) {
      return
    }
    const id = (e.currentTarget.dataset as { id?: string }).id
    if (!id) {
      return
    }
    wx.navigateTo({
      url: `/pages/contact/contact?threadId=${encodeURIComponent(id)}`,
    })
  },

  openListing(e: WechatMiniprogram.BaseEvent) {
    if (!ensureLoggedIn(REDIRECT)) {
      return
    }
    const id = (e.currentTarget.dataset as { id?: string }).id
    const type = (e.currentTarget.dataset as { type?: string }).type || 'provider'
    if (!id) {
      wx.showToast({ title: '暂无关联信息', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/detail/detail?id=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}`,
    })
  },

  goLogin() {
    wx.navigateTo({
      url: `/pages/login/login?redirect=${encodeURIComponent(REDIRECT)}`,
    })
  },
})
