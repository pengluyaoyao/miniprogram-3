import { callCloud } from '../../utils/cloud'
import { ensureLoggedIn, isLoggedIn } from '../../utils/auth'
import { formatCloudTime } from '../../utils/formatTime'

const REDIRECT = '/pages/my-favorites/my-favorites'

type Row = {
  _id: string
  listing_id: string
  listing_type: 'provider' | 'request'
  title: string
  typeLabel: string
  timeLabel: string
}

Page({
  data: {
    rows: [] as Row[],
    loading: true,
    empty: false,
    needLogin: false,
  },

  onShow() {
    if (!isLoggedIn()) {
      this.setData({ loading: false, rows: [], empty: true, needLogin: true })
      return
    }
    this.setData({ needLogin: false })
    this.loadList()
  },

  loadList() {
    this.setData({ loading: true })
    callCloud('getMyFavorites')
      .then((res) => {
        const r = res.result as { ok?: boolean; items?: Record<string, unknown>[]; errMsg?: string }
        if (!r || !r.ok) {
          wx.showToast({ title: (r && r.errMsg) || '加载失败', icon: 'none' })
          this.setData({ rows: [], empty: true, loading: false })
          return
        }
        const items = r.items || []
        const rows: Row[] = items.map((doc) => {
          const listingType = doc.listing_type === 'request' ? 'request' : 'provider'
          return {
            _id: String(doc._id),
            listing_id: String(doc.listing_id),
            listing_type: listingType,
            title: String(doc.title_cache || '收藏项'),
            typeLabel: listingType === 'request' ? '宠主需求' : '寄养家庭',
            timeLabel: formatCloudTime(doc.created_at),
          }
        })
        this.setData({ rows, empty: rows.length === 0, loading: false })
      })
      .catch(() => {
        this.setData({ rows: [], empty: true, loading: false })
        wx.showToast({ title: '网络异常', icon: 'none' })
      })
  },

  openDetail(e: WechatMiniprogram.BaseEvent) {
    if (!ensureLoggedIn(REDIRECT)) {
      return
    }
    const id = (e.currentTarget.dataset as { id?: string }).id
    const type = (e.currentTarget.dataset as { type?: string }).type || 'provider'
    if (!id) {
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
