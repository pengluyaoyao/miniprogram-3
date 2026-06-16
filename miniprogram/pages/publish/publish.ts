import { requestNewMessageSubscribe } from '../../constants/subscribeMessage'
import { callCloud } from '../../utils/cloud'
import { resolveCloudFileUrls } from '../../utils/cloudImages'
import { compressAndUploadImages } from '../../utils/uploadImage'
import { ensureLoggedIn, isLoggedIn } from '../../utils/auth'
import { refreshMessageBadge } from '../../utils/inboxBadge'
import {
  initRegionFromStorage,
  onRegionColumnChange,
  onRegionPickerChange,
  getPublishRegion,
  buildRegionPageFields,
  regionIndicesFromLocationCity,
} from '../../utils/regionPicker'
import {
  addDaysYmd,
  formatBoardingRangeLabel,
  todayYmd,
} from '../../utils/boardingPeriod'
import { PUBLISH_PREVIEW_DRAFT_KEY } from '../../constants/publishPreview'

const PUBLISH_REDIRECT = '/pages/publish/publish'

const emptyOwner = () => {
  const start = todayYmd()
  return {
    petName: '',
    petType: '',
    size: '',
    boardingStartDate: start,
    boardingEndDate: addDaysYmd(start, 3),
    boardingPeriodLabel: formatBoardingRangeLabel(start, addDaysYmd(start, 3)),
    distanceText: '',
    description: '',
    petPhotos: [] as string[],
    petPhotoDisplay: [] as string[],
  }
}

type ProviderForm = {
  displayName: string
  years: string
  acceptPets: string
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
  svcMed: false,
  svcPickup: false,
  svcVideo: false,
  svcCamera: false,
  otherServices: '',
  envPhotos: [],
  envPhotoDisplay: [] as string[],
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
    submitting: false,
    msgUnread: 0,
    regionCityIndex: 0,
    regionDistrictIndex: 10,
    regionPickerRange: [['上海市'], ['浦东新区']] as [string[], string[]],
    regionPickerValue: [0, 10] as [number, number],
    regionLabel: '',
    isEdit: false,
    editId: '',
    editListType: 'request' as 'provider' | 'request',
    pageTitle: '发布信息',
    submitBtnText: '生成文案并发布信息',
  },

  onLoad(query: Record<string, string | undefined>) {
    const editId = (query.editId && decodeURIComponent(query.editId)) || ''
    const typeRaw = (query.type && decodeURIComponent(query.type)) || 'request'
    const editListType = typeRaw === 'provider' ? 'provider' : 'request'
    const isEdit = !!editId

    try {
      const region = initRegionFromStorage()
      this.setData({
        regionCityIndex: region.regionCityIndex,
        regionDistrictIndex: region.regionDistrictIndex,
        regionPickerRange: region.regionPickerRange,
        regionPickerValue: region.regionPickerValue,
        regionLabel: region.regionLabel,
        isEdit,
        editId,
        editListType,
        role: editListType === 'provider' ? 'provider' : 'owner',
        pageTitle: isEdit ? '修改发布' : '发布信息',
        submitBtnText: isEdit ? '保存修改' : '生成文案并发布信息',
      })
      if (isEdit) {
        this.loadForEdit(editId, editListType)
      }
    } catch (err) {
      console.error('publish onLoad region init failed', err)
      this.setData({
        regionPickerRange: [['上海市'], ['浦东新区']],
        regionPickerValue: [0, 10],
        regionLabel: '上海市浦东新区',
        regionCityIndex: 0,
        regionDistrictIndex: 10,
      })
    }
  },

  onShow() {
    refreshMessageBadge(this)
    if (isLoggedIn()) {
      this.setData({ didPromptAuth: false })
      return
    }
    if (this.data.didPromptAuth) {
      return
    }
    this.setData({ didPromptAuth: true })
    wx.showToast({ title: '发布前请先登录', icon: 'none' })
    setTimeout(() => {
      wx.navigateTo({
        url: `/pages/login/login?redirect=${encodeURIComponent(PUBLISH_REDIRECT)}`,
      })
    }, 400)
  },

  loadForEdit(listingId: string, listType: 'provider' | 'request') {
    wx.showLoading({ title: '加载中' })
    callCloud('getMyListingForEdit', { listingId, listingType: listType })
      .then((res) => {
        const r = res.result as { ok?: boolean; doc?: Record<string, unknown>; errMsg?: string }
        if (!r || !r.ok || !r.doc) {
          wx.showToast({ title: (r && r.errMsg) || '加载失败', icon: 'none' })
          return
        }
        const doc = r.doc
        const cityLabel = String(doc.location_city || '')
        const indices = regionIndicesFromLocationCity(cityLabel)
        const regionPatch = indices
          ? buildRegionPageFields(indices.cityIndex, indices.districtIndex)
          : { regionLabel: cityLabel || this.data.regionLabel }

        if (listType === 'provider') {
          const tags = ((doc.service_tags as string[]) || []) as string[]
          const other = tags.filter(
            (t) => !['喂药', '接送', '视频', '摄像头'].includes(t)
          )
          this.setData({
            ...regionPatch,
            provider: {
              displayName: String(doc.display_name || ''),
              years: String(doc.years_experience ?? ''),
              acceptPets: ((doc.pet_types as string[]) || []).join('、'),
              svcMed: tags.includes('喂药'),
              svcPickup: tags.includes('接送'),
              svcVideo: tags.includes('视频'),
              svcCamera: tags.includes('摄像头'),
              otherServices: other.join('、'),
              envPhotos: ((doc.environment_photos as string[]) || []).slice(),
              envPhotoDisplay: [],
            },
            contactPhone: String(doc.phone || ''),
            contactWechat: String(doc.wechat_id || ''),
            contactSocial: String(doc.social_accounts || ''),
            step: 1,
          })
          this.syncProviderEnvPhotoDisplay()
        } else {
          const start = String(doc.start_date || '').slice(0, 10) || todayYmd()
          const end = String(doc.end_date || '').slice(0, 10) || addDaysYmd(start, 3)
          this.setData({
            ...regionPatch,
            owner: {
              petName: String(doc.pet_name || ''),
              petType: String(doc.pet_type || ''),
              size: String(doc.size || ''),
              boardingStartDate: start,
              boardingEndDate: end,
              boardingPeriodLabel: formatBoardingRangeLabel(start, end),
              distanceText: ((doc.requirements as string[]) || []).join('；') || '',
              description: String(doc.description || ''),
              petPhotos: ((doc.pet_photos as string[]) || []).slice(),
              petPhotoDisplay: [],
            },
            contactPhone: String(doc.phone || ''),
            contactWechat: String(doc.wechat_id || ''),
            contactSocial: String(doc.social_accounts || ''),
            step: 1,
          })
          this.syncOwnerPetPhotoDisplay()
        }
      })
      .catch(() => {
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
      .finally(() => {
        wx.hideLoading()
      })
  },

  switchRole(e: WechatMiniprogram.BaseEvent) {
    if (this.data.isEdit) {
      return
    }
    const role = e.currentTarget.dataset.role as 'owner' | 'provider'
    this.setData({ role, step: 1 })
  },

  validateOwnerBoardingDates(): boolean {
    const { boardingStartDate, boardingEndDate } = this.data.owner
    if (!boardingStartDate || !boardingEndDate) {
      wx.showToast({ title: '请选择寄养起止日期', icon: 'none' })
      return false
    }
    if (boardingEndDate < boardingStartDate) {
      wx.showToast({ title: '结束日期不能早于开始', icon: 'none' })
      return false
    }
    return true
  },

  syncBoardingPeriodLabel() {
    const { boardingStartDate, boardingEndDate } = this.data.owner
    this.setData({
      'owner.boardingPeriodLabel': formatBoardingRangeLabel(
        boardingStartDate,
        boardingEndDate
      ),
    })
  },

  onBoardingStartChange(e: WechatMiniprogram.PickerChange) {
    const start = String(e.detail.value || '')
    const owner = this.data.owner
    let end = owner.boardingEndDate
    if (!end || end < start) {
      end = addDaysYmd(start, 3)
    }
    this.setData(
      {
        'owner.boardingStartDate': start,
        'owner.boardingEndDate': end,
      },
      () => this.syncBoardingPeriodLabel()
    )
  },

  onBoardingEndChange(e: WechatMiniprogram.PickerChange) {
    const end = String(e.detail.value || '')
    const start = this.data.owner.boardingStartDate
    if (start && end < start) {
      wx.showToast({ title: '结束日期不能早于开始', icon: 'none' })
      return
    }
    this.setData({ 'owner.boardingEndDate': end }, () => this.syncBoardingPeriodLabel())
  },

  nextStep() {
    if (this.data.step === 1 && !this.data.regionLabel) {
      wx.showToast({ title: '请选择所在市区', icon: 'none' })
      return
    }
    if (this.data.step === 2 && this.data.role === 'owner' && !this.validateOwnerBoardingDates()) {
      return
    }
    const next = Math.min(this.data.step + 1, 3)
    this.setData({ step: next })
  },

  prevStep() {
    const prev = Math.max(this.data.step - 1, 1)
    this.setData({ step: prev })
  },

  onRegionColumnChange(e: WechatMiniprogram.PickerColumnChange) {
    const patch = onRegionColumnChange(
      e.detail.column,
      e.detail.value,
      this.data.regionPickerValue[0]
    )
    if (patch) {
      this.setData(patch)
    }
  },

  syncOwnerPetPhotoDisplay() {
    const ids = this.data.owner.petPhotos || []
    resolveCloudFileUrls(ids).then((urls) => {
      this.setData({ 'owner.petPhotoDisplay': urls })
    })
  },

  syncProviderEnvPhotoDisplay() {
    const ids = this.data.provider.envPhotos || []
    resolveCloudFileUrls(ids).then((urls) => {
      this.setData({ 'provider.envPhotoDisplay': urls })
    })
  },

  onRegionChange(e: WechatMiniprogram.PickerChange) {
    const value = e.detail.value as number[]
    const region = onRegionPickerChange(value)
    this.setData({
      regionCityIndex: region.regionCityIndex,
      regionDistrictIndex: region.regionDistrictIndex,
      regionPickerRange: region.regionPickerRange,
      regionPickerValue: region.regionPickerValue,
      regionLabel: region.regionLabel,
    })
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
        const paths = (res.tempFiles || []).map((f) => f.tempFilePath).filter(Boolean)
        if (!paths.length) {
          return
        }
        wx.showLoading({ title: '压缩上传中' })
        compressAndUploadImages(paths, 'env')
          .then((ids) => {
            const cur = prov.envPhotos || []
            this.setData({ 'provider.envPhotos': [...cur, ...ids] }, () => this.syncProviderEnvPhotoDisplay())
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
    const cur = this.data.provider.envPhotos || []
    const next = cur.filter((_, i) => i !== idx)
    this.setData({ 'provider.envPhotos': next }, () => this.syncProviderEnvPhotoDisplay())
  },

  choosePetPhotos() {
    const owner = this.data.owner
    const remain = 3 - owner.petPhotos.length
    if (remain <= 0) {
      wx.showToast({ title: '最多 3 张', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const paths = (res.tempFiles || []).map((f) => f.tempFilePath).filter(Boolean)
        if (!paths.length) {
          return
        }
        wx.showLoading({ title: '压缩上传中' })
        compressAndUploadImages(paths, 'pet')
          .then((ids) => {
            const cur = owner.petPhotos || []
            this.setData({ 'owner.petPhotos': [...cur, ...ids] }, () => this.syncOwnerPetPhotoDisplay())
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
    this.setData({ 'owner.petPhotos': next }, () => this.syncOwnerPetPhotoDisplay())
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

  submit() {
    if (!ensureLoggedIn(PUBLISH_REDIRECT)) {
      return
    }
    const region = getPublishRegion(
      this.data.regionCityIndex,
      this.data.regionDistrictIndex
    )
    if (!region.cityDistrict) {
      wx.showToast({ title: '请选择所在市区', icon: 'none' })
      return
    }

    const phone = this.data.contactPhone.trim()
    const wechat = this.data.contactWechat.trim()

    if (this.data.role === 'provider' && !this.data.provider.displayName.trim()) {
      wx.showToast({ title: '请填写寄养家庭名称', icon: 'none' })
      return
    }
    if (this.data.role === 'owner' && !this.validateOwnerBoardingDates()) {
      return
    }

    requestNewMessageSubscribe().finally(() => {
      this.publishAfterSubscribe(phone, wechat, region)
    })
  },

  publishAfterSubscribe(
    phone: string,
    wechat: string,
    region: ReturnType<typeof getPublishRegion>
  ) {
    const isProviderNew = this.data.role === 'provider' && !this.data.isEdit
    wx.showLoading({
      title: isProviderNew ? '检测并生成文案…' : '安全检测中…',
      mask: true,
    })
    this.setData({ submitting: true })
    const locationFields = {
      city: region.city,
      district: region.district,
      cityDistrict: region.cityDistrict,
    }
    const listingId = this.data.isEdit ? this.data.editId : ''
    const payload: Record<string, unknown> =
      this.data.role === 'provider'
        ? {
            role: 'provider',
            listingId,
            provider: {
              displayName: this.data.provider.displayName,
              years: this.data.provider.years,
              acceptPets: this.data.provider.acceptPets,
              ...locationFields,
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
            role: 'owner',
            listingId,
            owner: {
              ...this.data.owner,
              ...locationFields,
              phone,
              wechatId: wechat,
              social: this.data.contactSocial.trim(),
            },
          }

    const cloudName = isProviderNew ? 'generateXhsCopy' : 'publishListing'
    const generatePayload = isProviderNew ? { provider: payload.provider } : payload

    callCloud(cloudName, generatePayload, { slow: isProviderNew })
      .then((res) => {
        if (isProviderNew) {
          const r = res.result as {
            ok?: boolean
            errMsg?: string
            copy?: {
              title?: string
              body?: string
              hashtags?: string[]
              highlights?: string[]
              coverImagePrompt?: string
            }
            publishPayload?: Record<string, unknown>
          }
          if (r && r.ok && r.copy && r.publishPayload) {
            wx.setStorageSync(PUBLISH_PREVIEW_DRAFT_KEY, {
              copy: r.copy,
              publishPayload: r.publishPayload,
            })
            wx.navigateTo({ url: '/pages/publish-preview/publish-preview' })
          } else {
            wx.showToast({ title: r?.errMsg || '文案生成失败', icon: 'none', duration: 2800 })
          }
          return
        }

        const r = res.result as { ok?: boolean; errMsg?: string }
        if (r && r.ok) {
          const wasEdit = this.data.isEdit
          wx.showToast({ title: wasEdit ? '已保存' : '发布成功', icon: 'success' })
          if (wasEdit) {
            setTimeout(() => wx.navigateBack(), 600)
            return
          }
          const regionInit = initRegionFromStorage()
          this.setData({
            step: 1,
            isEdit: false,
            editId: '',
            owner: emptyOwner(),
            provider: emptyProvider(),
            contactPhone: '',
            contactWechat: '',
            contactSocial: '',
            regionLabel: regionInit.regionLabel,
            regionPickerValue: regionInit.regionPickerValue,
            regionPickerRange: regionInit.regionPickerRange,
            regionCityIndex: regionInit.regionCityIndex,
            regionDistrictIndex: regionInit.regionDistrictIndex,
            pageTitle: '发布信息',
            submitBtnText: '生成文案并发布信息',
          })
          setTimeout(() => wx.reLaunch({ url: '/pages/home/home' }), 800)
        } else {
          wx.showToast({ title: r?.errMsg || '发布失败', icon: 'none', duration: 2800 })
        }
      })
      .catch((err: { errMsg?: string }) => {
        wx.showToast({
          title:
            err.errMsg ||
            (isProviderNew
              ? '请上传并部署云函数 generateXhsCopy'
              : '请上传并部署云函数 publishListing'),
          icon: 'none',
          duration: 2800,
        })
      })
      .finally(() => {
        wx.hideLoading()
        this.setData({ submitting: false })
      })
  },

  goHome() {
    wx.reLaunch({ url: '/pages/home/home' })
  },
  goPublish() {},
  goMy() {
    wx.reLaunch({ url: '/pages/my/my' })
  },
})
