import { callCloud } from '../../utils/cloud'
import { ensureLoggedIn } from '../../utils/auth'
import {
  PUBLISH_PREVIEW_DRAFT_KEY,
  PublishPreviewDraft,
  XhsCopyPreview,
} from '../../constants/publishPreview'

const emptyCopy = (): XhsCopyPreview => ({
  title: '',
  body: '',
  hashtags: [],
  highlights: [],
})

Page({
  data: {
    loaded: false,
    publishing: false,
    copy: emptyCopy(),
  },

  onLoad() {
    if (!ensureLoggedIn('/pages/publish/publish')) {
      return
    }
    const draft = wx.getStorageSync(PUBLISH_PREVIEW_DRAFT_KEY) as PublishPreviewDraft | undefined
    if (!draft || !draft.copy || !draft.publishPayload) {
      this.setData({ loaded: false })
      return
    }
    this.draft = draft
    this.setData({
      loaded: true,
      copy: {
        title: draft.copy.title || '',
        body: draft.copy.body || '',
        hashtags: draft.copy.hashtags || [],
        highlights: draft.copy.highlights || [],
      },
    })
  },

  draft: null as PublishPreviewDraft | null,

  goBackEdit() {
    wx.navigateBack()
  },

  goPublish() {
    wx.redirectTo({ url: '/pages/publish/publish' })
  },

  copyAll() {
    const { copy } = this.data
    const tags = (copy.hashtags || []).join(' ')
    const text = `${copy.title}\n\n${copy.body}\n\n${tags}`.trim()
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: '已复制，可粘贴到小红书', icon: 'none' })
      },
    })
  },

  confirmPublish() {
    if (!this.draft || !this.draft.publishPayload) {
      wx.showToast({ title: '预览数据已失效', icon: 'none' })
      return
    }
    if (this.data.publishing) {
      return
    }
    this.setData({ publishing: true })
    wx.showLoading({ title: '发布中…', mask: true })
    callCloud(
      'publishListing',
      {
        ...this.draft.publishPayload,
        xhsCopy: this.draft.copy,
      },
      { slow: true }
    )
      .then((res) => {
        const r = res.result as { ok?: boolean; errMsg?: string }
        if (r && r.ok) {
          wx.removeStorageSync(PUBLISH_PREVIEW_DRAFT_KEY)
          wx.showToast({ title: '发布成功', icon: 'success' })
          setTimeout(() => wx.reLaunch({ url: '/pages/home/home' }), 800)
        } else {
          wx.showToast({ title: r?.errMsg || '发布失败', icon: 'none', duration: 2800 })
        }
      })
      .catch((err: { errMsg?: string }) => {
        wx.showToast({
          title: err.errMsg || '请上传并部署云函数 publishListing',
          icon: 'none',
          duration: 2800,
        })
      })
      .finally(() => {
        wx.hideLoading()
        this.setData({ publishing: false })
      })
  },
})
