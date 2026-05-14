import { callCloud } from '../../utils/cloud'
import { ensureLoggedIn, isLoggedIn } from '../../utils/auth'
import { refreshMessageBadge } from '../../utils/inboxBadge'

const INBOX_REDIRECT = '/pages/inbox/inbox'

type ThreadRow = {
  _id: string
  listing_id?: string
  listing_title_cache: string
  listing_type: string
  last_message_body: string
  unread: number
  other_openid_tail: string
}

Page({
  data: {
    threads: [] as ThreadRow[],
    loading: true,
    empty: false,
    msgUnread: 0,
    needLogin: false,
  },

  onShow() {
    if (!isLoggedIn()) {
      this.setData({
        loading: false,
        threads: [],
        empty: true,
        needLogin: true,
      })
      return
    }
    this.setData({ needLogin: false })
    this.loadThreads()
    refreshMessageBadge(this)
  },

  loadThreads() {
    this.setData({ loading: true })
    callCloud('chatInbox')
      .then((res) => {
        const r = res.result as { ok?: boolean; threads?: ThreadRow[] }
        const list = (r && r.ok && r.threads) || []
        this.setData({
          threads: list,
          empty: list.length === 0,
          loading: false,
        })
      })
      .catch(() => {
        this.setData({ threads: [], empty: true, loading: false })
      })
  },

  openThread(e: WechatMiniprogram.BaseEvent) {
    if (!ensureLoggedIn(INBOX_REDIRECT)) {
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

  goLogin() {
    wx.navigateTo({
      url: `/pages/login/login?redirect=${encodeURIComponent(INBOX_REDIRECT)}`,
    })
  },
})
