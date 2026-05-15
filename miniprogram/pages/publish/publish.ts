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
  petPhotos: [] as string[],
})

type ProviderForm = {
  displayName: string
  years: string
  acceptPets: string
  cityDistrict: string
  svcMed: boolean
  svcPickup: boolean
  svcVideo: boolean
  svcCamera: boolean
  otherServices: string
  envPhotos: string[]
}

const emptyProvider = (): ProviderForm => ({
  displayName: '',
  years: '',
  acceptPets: '',
  cityDistrict: '',
  svcMed: false,
  svcPickup: false,
  svcVideo: false,
  svcCamera: false,
  otherServices: '',
  envPhotos: [],
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

  toggleProviderSvc(e: WechatMiniprogram.BaseEvent) {
    const field = (e.currentTarget.dataset as { field?: keyof ProviderForm }).field
    if (!field || !['svcMed', 'svcPickup', 'svcVideo', 'svcCamera'].includes(field as string)) {
      return
    }
    const p = this.data.provider
    const cur = !!p[field as keyof ProviderForm]
    this.setData({ [`provider.${field}`]: !cur })
  },

  chooseEnvPhotos() {
    const prov = this.data.provider
    const remain = 9 - prov.envPhotos.length
    if (remain <= 0) {
      wx.showToast({ title: '最多 9 张', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const paths = res.tempFiles.map((f) => f.tempFilePath)
        wx.showLoading({ title: '上传中', mask: true })
        const uploads = paths.map((filePath, i) =>
          wx.cloud.uploadFile({
            cloudPath: `provider_env/${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}.jpg`,
            filePath,
          })
        )
        Promise.all(uploads)
          .then((results) => {
            const ids = results.map((r) => r.fileID)
            this.setData({ 'provider.envPhotos': [...prov.envPhotos, ...ids] })
            wx.showToast({ title: '已上传', icon: 'success' })
          })
          .catch(() => {
            wx.showToast({ title: '上传失败，请检查云存储权限', icon: 'none' })
          })
          .finally(() => {
            wx.hideLoading()
          })
      },
    })
  },

  removeEnvPhoto(e: WechatMiniprogram.BaseEvent) {
    const idx = Number((e.currentTarget.dataset as { idx?: string }).idx)
    if (!Number.isFinite(idx) || idx < 0) {
      return
    }
    const next = this.data.provider.envPhotos.filter((_, i) => i !== idx)
    this.setData({ 'provider.envPhotos': next })
  },

  choosePetPhotos() {
    const owner = this.data.owner as { petPhotos?: string[] }
    const cur = owner.petPhotos || []
    const remain = 3 - cur.length
    if (remain <= 0) {
      wx.showToast({ title: '最多 3 张', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const paths = res.tempFiles.map((f) => f.tempFilePath)
        wx.showLoading({ title: '上传中', mask: true })
        const uploads = paths.map((filePath, i) =>
          wx.cloud.uploadFile({
            cloudPath: `owner_pet/${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}.jpg`,
            filePath,
          })
        )
        Promise.all(uploads)
          .then((results) => {
            const ids = results.map((r) => r.fileID)
            this.setData({ 'owner.petPhotos': [...cur, ...ids] })
            wx.showToast({ title: '已上传', icon: 'success' })
          })
          .catch(() => {
            wx.showToast({ title: '上传失败，请检查云存储权限', icon: 'none' })
          })
          .finally(() => {
            wx.hideLoading()
          })
      },
    })
  },

  removePetPhoto(e: WechatMiniprogram.BaseEvent) {
    const idx = Number((e.currentTarget.dataset as { idx?: string }).idx)
    if (!Number.isFinite(idx) || idx < 0) {
      return
    }
    const cur = (this.data.owner as { petPhotos: string[] }).petPhotos || []
    const next = cur.filter((_, i) => i !== idx)
    this.setData({ 'owner.petPhotos': next })
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

    const lat = this.data.lat
    const lng = this.data.lng

    const run = (latNum: number, lngNum: number) => {
      this.setData({ submitting: true })
      const base = {
        role: this.data.role,
        lat: latNum,
        lng: lngNum,
      }
      const payload: Record<string, unknown> =
        this.data.role === 'provider'
          ? {
              ...base,
              provider: {
                displayName: this.data.provider.displayName,
                years: this.data.provider.years,
                acceptPets: this.data.provider.acceptPets,
                cityDistrict: this.data.provider.cityDistrict,
                svcMed: this.data.provider.svcMed,
                svcPickup: this.data.provider.svcPickup,
                svcVideo: this.data.provider.svcVideo,
                svcCamera: this.data.provider.svcCamera,
                otherServices: this.data.provider.otherServices,
                environmentPhotos: this.data.provider.envPhotos,
                phone,
                wechatId: wechat,
                social: this.data.contactSocial.trim(),
              },
            }
          : {
              ...base,
              owner: {
                ...this.data.owner,
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
