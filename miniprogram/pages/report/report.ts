import { callCloud } from '../../utils/cloud'
import { ensureLoggedIn, isLoggedIn } from '../../utils/auth'

const REASONS = ['虚假信息', '联系方式无效', '骚扰或不当内容', '其他']

Page({
  data: {
    listingId: '',
    listingType: 'provider' as 'provider' | 'request',
    listingTitle: '',
    reasonIndex: 0,
    reasons: REASONS,
    detail: '',
    submitting: false,
    needLogin: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    const id = (query.id && decodeURIComponent(query.id)) || ''
    const typeRaw = (query.type && decodeURIComponent(query.type)) || 'provider'
    const listingType = typeRaw === 'request' ? 'request' : 'provider'
    const listingTitle = (query.title && decodeURIComponent(query.title)) || ''
    if (!id) {
      wx.showToast({ title: '缺少信息', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 400)
      return
    }
    this.setData({ listingId: id, listingType, listingTitle })
    if (!isLoggedIn()) {
      this.setData({ needLogin: true })
      return
    }
    this.setData({ needLogin: false })
  },

  onShow() {
    if (this.data.listingId && isLoggedIn()) {
      this.setData({ needLogin: false })
    }
  },

  onReasonChange(e: WechatMiniprogram.PickerChange) {
    const idx = Number(e.detail.value)
    this.setData({ reasonIndex: Number.isFinite(idx) ? idx : 0 })
  },

  onDetail(e: WechatMiniprogram.Input) {
    this.setData({ detail: e.detail.value })
  },

  submit() {
    const redirect = `/pages/report/report?id=${encodeURIComponent(this.data.listingId)}&type=${encodeURIComponent(
      this.data.listingType
    )}&title=${encodeURIComponent(this.data.listingTitle)}`
    if (!ensureLoggedIn(redirect)) {
      return
    }
    const detail = this.data.detail.trim()
    if (!detail) {
      wx.showToast({ title: '请填写说明', icon: 'none' })
      return
    }
    const reason = REASONS[this.data.reasonIndex] || '其他'
    this.setData({ submitting: true })
    callCloud('submitReport', {
      listingId: this.data.listingId,
      listingType: this.data.listingType,
      listingTitle: this.data.listingTitle,
      reason,
      detail,
    })
      .then((res) => {
        const r = res.result as { ok?: boolean; errMsg?: string }
        if (!r || !r.ok) {
          wx.showToast({ title: (r && r.errMsg) || '提交失败', icon: 'none' })
          return
        }
        wx.showToast({ title: '已提交', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 500)
      })
      .catch(() => {
        wx.showToast({ title: '网络异常', icon: 'none' })
      })
      .finally(() => {
        this.setData({ submitting: false })
      })
  },

  goLogin() {
    const { listingId, listingType, listingTitle } = this.data
    const path = `/pages/report/report?id=${encodeURIComponent(listingId)}&type=${encodeURIComponent(
      listingType
    )}&title=${encodeURIComponent(listingTitle)}`
    wx.navigateTo({
      url: `/pages/login/login?redirect=${encodeURIComponent(path)}`,
    })
  },
})
