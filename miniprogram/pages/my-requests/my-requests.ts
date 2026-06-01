import { callCloud } from '../../utils/cloud'
import { ensureLoggedIn, isLoggedIn } from '../../utils/auth'
import { formatCloudTime } from '../../utils/formatTime'

const REDIRECT = '/pages/my-requests/my-requests'

type Row = {
  _id: string
  listType: 'provider' | 'request'
  typeLabel: string
  title: string
  sub: string
  timeLabel: string
  statusLabel: string
  canEdit: boolean
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
    callCloud('getMyPublications')
      .then((res) => {
        const r = res.result as {
          ok?: boolean
          items?: {
            _id: string
            listType: 'provider' | 'request'
            title: string
            sub: string
            status?: string
            statusLabel?: string
            created_at?: unknown
          }[]
          errMsg?: string
        }
        if (!r || !r.ok) {
          wx.showToast({ title: (r && r.errMsg) || '加载失败', icon: 'none' })
          this.setData({ rows: [], empty: true, loading: false })
          return
        }
        const items = r.items || []
        const rows: Row[] = items.map((doc) => ({
          _id: String(doc._id),
          listType: doc.listType === 'provider' ? 'provider' : 'request',
          typeLabel: doc.listType === 'provider' ? '寄养家庭' : '宠主需求',
          title: doc.title,
          sub: doc.sub,
          timeLabel: formatCloudTime(doc.created_at),
          statusLabel: doc.statusLabel || '展示中',
          canEdit: doc.status !== 'hidden',
        }))
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
    const type = (e.currentTarget.dataset as { type?: string }).type || 'request'
    if (!id) {
      return
    }
    wx.navigateTo({
      url: `/pages/detail/detail?id=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}`,
    })
  },

  onEdit(e: WechatMiniprogram.BaseEvent) {
    if (!ensureLoggedIn(REDIRECT)) {
      return
    }
    const id = (e.currentTarget.dataset as { id?: string }).id
    const type = (e.currentTarget.dataset as { type?: string }).type || 'request'
    if (!id) {
      return
    }
    wx.navigateTo({
      url: `/pages/publish/publish?editId=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}`,
    })
  },

  onDelete(e: WechatMiniprogram.BaseEvent) {
    if (!ensureLoggedIn(REDIRECT)) {
      return
    }
    const id = (e.currentTarget.dataset as { id?: string }).id
    const type = (e.currentTarget.dataset as { type?: string }).type || 'request'
    if (!id) {
      return
    }
    wx.showModal({
      title: '删除发布',
      content: '删除后将从首页下架，是否继续？',
      confirmText: '删除',
      confirmColor: '#dc2626',
      success: (res) => {
        if (!res.confirm) {
          return
        }
        callCloud('deleteMyListing', { listingId: id, listingType: type })
          .then((cloudRes) => {
            const r = cloudRes.result as { ok?: boolean; errMsg?: string }
            if (!r || !r.ok) {
              wx.showToast({ title: (r && r.errMsg) || '删除失败', icon: 'none' })
              return
            }
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadList()
          })
          .catch(() => {
            wx.showToast({ title: '网络异常', icon: 'none' })
          })
      },
    })
  },

  goLogin() {
    wx.navigateTo({
      url: `/pages/login/login?redirect=${encodeURIComponent(REDIRECT)}`,
    })
  },
})
