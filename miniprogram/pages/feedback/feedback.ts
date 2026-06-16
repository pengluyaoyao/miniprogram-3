import { callCloud } from '../../utils/cloud'
import { getLocalUserBrief, isLoggedIn } from '../../utils/auth'

const CATEGORIES = ['功能建议', '问题反馈', '合作咨询', '其他']

Page({
  data: {
    categories: CATEGORIES,
    categoryIndex: 0,
    body: '',
    contactPhone: '',
    contactWechat: '',
    submitting: false,
  },

  onCategoryChange(e: WechatMiniprogram.PickerChange) {
    const idx = Number(e.detail.value)
    this.setData({ categoryIndex: Number.isFinite(idx) ? idx : 0 })
  },

  onBody(e: WechatMiniprogram.Input) {
    this.setData({ body: e.detail.value })
  },

  onPhone(e: WechatMiniprogram.Input) {
    this.setData({ contactPhone: e.detail.value })
  },

  onWechat(e: WechatMiniprogram.Input) {
    this.setData({ contactWechat: e.detail.value })
  },

  submit() {
    const body = this.data.body.trim()
    if (body.length < 5) {
      wx.showToast({ title: '留言至少 5 个字', icon: 'none' })
      return
    }
    const category = CATEGORIES[this.data.categoryIndex] || '其他'
    const brief = isLoggedIn() ? getLocalUserBrief() : { nickname: '' }

    this.setData({ submitting: true })
    wx.showLoading({ title: '提交中…', mask: true })
    callCloud('submitFeedback', {
      category,
      body,
      contactPhone: this.data.contactPhone.trim(),
      contactWechat: this.data.contactWechat.trim(),
      nickname: brief.nickname || '',
    })
      .then((res) => {
        const r = res.result as { ok?: boolean; errMsg?: string }
        if (!r || !r.ok) {
          wx.showToast({ title: (r && r.errMsg) || '提交失败', icon: 'none', duration: 2800 })
          return
        }
        wx.showToast({ title: '已提交，感谢反馈', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 600)
      })
      .catch(() => {
        wx.showToast({ title: '请部署云函数 submitFeedback', icon: 'none', duration: 2800 })
      })
      .finally(() => {
        wx.hideLoading()
        this.setData({ submitting: false })
      })
  },
})
