import { callCloud } from '../../utils/cloud'
import { ensureLoggedIn, isLoggedIn } from '../../utils/auth'
import { formatCloudTime } from '../../utils/formatTime'

const REDIRECT = '/pages/my-requests/my-requests'

type Row = {
  _id: string
  title: string
  sub: string
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
    callCloud('getMyBoardingRequests')
      .then((res) => {
        const r = res.result as { ok?: boolean; items?: Record<string, unknown>[]; errMsg?: string }
        if (!r || !r.ok) {
          wx.showToast({ title: (r && r.errMsg) || '加载失败', icon: 'none' })
          this.setData({ rows: [], empty: true, loading: false })
          return
        }
        const items = r.items || []
        const rows: Row[] = items.map((doc) => {
          const pet = String(doc.pet_name || '宠物')
          const period = String(doc.date_range_text || '').trim()
          const city = String(doc.location_city || '').trim()
          const desc = String(doc.description || '').trim().slice(0, 60)
          return {
            _id: String(doc._id),
            title: `${pet} 的寄养需求`,
            sub: [period, city, desc].filter(Boolean).join(' · ') || '已发布',
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
    if (!id) {
      return
    }
    wx.navigateTo({
      url: `/pages/detail/detail?id=${encodeURIComponent(id)}&type=request`,
    })
  },

  goLogin() {
    wx.navigateTo({
      url: `/pages/login/login?redirect=${encodeURIComponent(REDIRECT)}`,
    })
  },
})
