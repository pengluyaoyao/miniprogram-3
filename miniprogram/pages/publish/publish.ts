import { callCloud } from '../../utils/cloud'
import { ensureLoggedIn, isLoggedIn } from '../../utils/auth'
import { getLocationCoarse, quantizeLocationRough } from '../../utils/location'
import { refreshMessageBadge } from '../../utils/inboxBadge'

const PUBLISH_REDIRECT = '/pages/publish/publish'

const emptyOwner = () => ({
  petName: '',
  petType: '',
  size: '',
  periodText: '',
  distanceText: '',
  description: '',
})

const emptyProvider = () => ({
  displayName: '',
  years: '',
  acceptPets: '',
  servicesText: '',
  envDesc: '',
})

Page({
  data: {
    role: 'owner' as 'owner' | 'provider',
    step: 1,
    didPromptAuth: false,
    owner: emptyOwner(),
    provider: emptyProvider(),
    contactPhone: '',
    contactWechat: '',
    contactSocial: '',
    lat: null as number | null,
    lng: null as number | null,
    submitting: false,
    msgUnread: 0,
  },

  onShow() {
    if (isLoggedIn()) {
      this.setData({ didPromptAuth: false })
      refreshMessageBadge(this)
      return
    }
    if (this.data.didPromptAuth) {
      return
    }
    this.setData({ didPromptAuth: true })
    wx.navigateTo({
      url: `/pages/login/login?redirect=${encodeURIComponent(PUBLISH_REDIRECT)}`,
    })
  },

  switchRole(e: WechatMiniprogram.BaseEvent) {
    const role = e.currentTarget.dataset.role as 'owner' | 'provider'
    this.setData({ role, step: 1 })
  },

  nextStep() {
    const next = Math.min(this.data.step + 1, 3)
    this.setData({ step: next })
  },

  prevStep() {
    const prev = Math.max(this.data.step - 1, 1)
    this.setData({ step: prev })
  },

  onFormField(e: WechatMiniprogram.Input) {
    const role = e.currentTarget.dataset.role as 'owner' | 'provider'
    const field = e.currentTarget.dataset.field as string
    const v = e.detail.value
    if (role === 'owner') {
      this.setData({ [`owner.${field}`]: v })
    } else {
      this.setData({ [`provider.${field}`]: v })
    }
  },

  onContactPhone(e: WechatMiniprogram.Input) {
    this.setData({ contactPhone: e.detail.value })
  },
  onContactWechat(e: WechatMiniprogram.Input) {
    this.setData({ contactWechat: e.detail.value })
  },
  onContactSocial(e: WechatMiniprogram.Input) {
    this.setData({ contactSocial: e.detail.value })
  },

  onGetLocationTap() {
    getLocationCoarse()
      .then((res) => {
        const q = quantizeLocationRough(res.latitude, res.longitude)
        this.setData({ lat: q.lat, lng: q.lng })
        wx.showToast({ title: '已获取大致位置（非高精度）', icon: 'none' })
      })
      .catch(() => {
        wx.showToast({ title: '未授权则使用默认上海坐标', icon: 'none' })
      })
  },

  submit() {
    if (!ensureLoggedIn(PUBLISH_REDIRECT)) {
      return
    }
    const phone = this.data.contactPhone.trim()
    const wechat = this.data.contactWechat.trim()
    if (!phone && !wechat) {
      wx.showToast({ title: '请填写手机号或微信号', icon: 'none' })
      return
    }

    const lat = this.data.lat
    const lng = this.data.lng

    const run = (latNum: number, lngNum: number) => {
      this.setData({ submitting: true })
      const payload: Record<string, unknown> = {
        role: this.data.role,
        lat: latNum,
        lng: lngNum,
        owner: {
          ...this.data.owner,
          phone,
          wechatId: wechat,
          social: this.data.contactSocial.trim(),
        },
        provider: {
          ...this.data.provider,
          phone,
          wechatId: wechat,
          social: this.data.contactSocial.trim(),
        },
      }
      callCloud('publishListing', payload)
        .then((res) => {
          const r = res.result as { ok?: boolean; errMsg?: string }
          if (r && r.ok) {
            wx.showToast({ title: '发布成功', icon: 'success' })
            this.setData({
              step: 1,
              owner: emptyOwner(),
              provider: emptyProvider(),
              contactPhone: '',
              contactWechat: '',
              contactSocial: '',
              lat: null,
              lng: null,
            })
            setTimeout(() => wx.reLaunch({ url: '/pages/home/home' }), 800)
          } else {
            wx.showToast({ title: r?.errMsg || '发布失败', icon: 'none' })
          }
        })
        .catch((err: { errMsg?: string }) => {
          wx.showToast({
            title: err.errMsg || '请上传并部署云函数 publishListing',
            icon: 'none',
          })
        })
        .finally(() => {
          this.setData({ submitting: false })
        })
    }

    if (lat != null && lng != null) {
      const q = quantizeLocationRough(lat, lng)
      run(q.lat, q.lng)
      return
    }
    getLocationCoarse()
      .then((res) => {
        const q = quantizeLocationRough(res.latitude, res.longitude)
        run(q.lat, q.lng)
      })
      .catch(() => run(31.2304, 121.4737))
  },

  goHome() {
    wx.reLaunch({ url: '/pages/home/home' })
  },
  goPublish() {},
  goMy() {
    wx.reLaunch({ url: '/pages/my/my' })
  },
  goMap() {
    wx.reLaunch({ url: '/pages/map/map' })
  },
})
