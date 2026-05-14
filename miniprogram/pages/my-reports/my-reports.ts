import { callCloud } from '../../utils/cloud'
import { ensureLoggedIn, isLoggedIn } from '../../utils/auth'
import { formatCloudTime } from '../../utils/formatTime'

const REDIRECT = '/pages/my-reports/my-reports'

type Row = {
  _id: string
  listing_title: string
  reason: string
  detail: string
  status: string
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
    callCloud('getMyReports')
      .then((res) => {
        const r = res.result as { ok?: boolean; items?: Record<string, unknown>[]; errMsg?: string }
        if (!r || !r.ok) {
          wx.showToast({ title: (r && r.errMsg) || '加载失败', icon: 'none' })
          this.setData({ rows: [], empty: true, loading: false })
          return
        }
        const items = r.items || []
        const rows: Row[] = items.map((doc) => ({
          _id: String(doc._id),
          listing_title: String(doc.listing_title || '信息'),
          reason: String(doc.reason || ''),
          detail: String(doc.detail || ''),
          status: String(doc.status || 'submitted'),
          timeLabel: formatCloudTime(doc.created_at),
        }))
        this.setData({ rows, empty: rows.length === 0, loading: false })
      })
      .catch(() => {
        this.setData({ rows: [], empty: true, loading: false })
        wx.showToast({ title: '网络异常', icon: 'none' })
      })
  },

  goLogin() {
    wx.navigateTo({
      url: `/pages/login/login?redirect=${encodeURIComponent(REDIRECT)}`,
    })
  },
})
