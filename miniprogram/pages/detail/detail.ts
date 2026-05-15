import { ensureLoggedIn } from '../../utils/auth'
import { callCloud } from '../../utils/cloud'
import { refreshMessageBadge } from '../../utils/inboxBadge'
import { SUBSCRIBE_MESSAGE_TEMPLATE_IDS } from '../../constants/subscribeMessage'

type CloudDoc = Record<string, unknown>

type PhotoCell = { url?: string; label: string; idx: number }

function buildPhotoCells(doc: CloudDoc, listingType: 'provider' | 'request'): PhotoCell[] {
  if (listingType === 'provider') {
    const urls = ((doc.environment_photos as string[]) || []).filter(
      (u) =>
        typeof u === 'string' &&
        (/^https?:\/\//.test(u) || /^cloud:\/\//.test(u))
    )
    if (urls.length) {
      return urls.slice(0, 6).map((url, i) => ({ url, label: '', idx: i }))
    }
    return [0, 1, 2, 3, 4, 5].map((i) => ({ label: i < 3 ? '环境照' : '待补充', idx: i }))
  }
  const urls = ((doc.pet_photos as string[]) || []).filter(
    (u) =>
      typeof u === 'string' &&
      (/^https?:\/\//.test(u) || /^cloud:\/\//.test(u))
  )
  if (urls.length) {
    return urls.slice(0, 6).map((url, i) => ({ url, label: '', idx: i }))
  }
  return [0, 1, 2].map((i) => ({ label: '宠物照', idx: i }))
}

Page({
  data: {
    listingId: '',
    listingType: 'provider' as 'provider' | 'request',
    loading: true,
    loadError: '',
    pageTitle: '详情',
    heroName: '',
    heroSub: '',
    tagList: [] as string[],
    photoSectionTitle: '照片',
    photoCells: [] as PhotoCell[],
    descSectionTitle: '简介',
    descText: '',
    msgUnread: 0,
  },

  onShow() {
    refreshMessageBadge(this)
  },

  onLoad(query: Record<string, string | undefined>) {
    const id = (query.id && decodeURIComponent(query.id)) || ''
    const typeRaw = (query.type && decodeURIComponent(query.type)) || 'provider'
    const listingType = typeRaw === 'request' ? 'request' : 'provider'
    if (!id) {
      this.setData({
        loading: false,
        loadError: '链接缺少信息，请从首页或地图进入',
        listingId: '',
        listingType,
      })
      return
    }
    this.setData({ listingId: id, listingType }, () => {
      this.loadDetail()
    })
  },

  detailRedirectPath(): string {
    const { listingId, listingType } = this.data
    if (!listingId) {
      return '/pages/detail/detail'
    }
    return `/pages/detail/detail?id=${encodeURIComponent(listingId)}&type=${encodeURIComponent(listingType)}`
  },

  loadDetail() {
    const { listingId, listingType } = this.data
    if (!listingId) {
      return
    }
    this.setData({ loading: true, loadError: '' })
    callCloud('getListingDetail', { id: listingId, listingType })
      .then((res) => {
        const r = res.result as { ok?: boolean; doc?: CloudDoc; errMsg?: string; listingType?: string }
        if (!r || !r.ok || !r.doc) {
          this.setData({
            loading: false,
            loadError: (r && r.errMsg) || '加载失败',
          })
          return
        }
        const doc = r.doc
        const lt = (r.listingType === 'request' ? 'request' : 'provider') as 'provider' | 'request'
        if (lt === 'provider') {
          const years = Number(doc.years_experience) || 0
          const tags = ((doc.service_tags as string[]) || []).slice(0, 8)
          const heroSub = years > 0 ? `服务经验 ${years} 年 · 平台展示` : '寄养家庭 · 平台展示'
          const desc =
            String(doc.env_description || doc.service_summary || doc.price_description || '').trim() ||
            '暂无详细介绍'
          this.setData({
            loading: false,
            loadError: '',
            listingType: 'provider',
            pageTitle: '寄养家庭详情',
            heroName: String(doc.display_name || '寄养家庭'),
            heroSub,
            tagList: tags.length ? tags : ['家庭寄养'],
            photoSectionTitle: '寄养家庭照片',
            photoCells: buildPhotoCells(doc, 'provider'),
            descSectionTitle: '环境与说明',
            descText: desc,
          })
        } else {
          const petName = String(doc.pet_name || '宠物')
          const petType = String(doc.pet_type || '')
          const size = String(doc.size || '')
          const period = String(doc.date_range_text || '').trim()
          const city = String(doc.location_city || '').trim()
          const heroSub = [period, city].filter(Boolean).join(' · ') || '宠主寄养需求'
          const req = (doc.requirements as string[]) || []
          const tagList = [petType, size, ...req].map((t) => String(t).trim()).filter(Boolean).slice(0, 8)
          const desc =
            String(doc.description || '').trim() ||
            (req.length ? req.join('；') : '暂无详细描述')
          this.setData({
            loading: false,
            loadError: '',
            listingType: 'request',
            pageTitle: '宠主需求详情',
            heroName: `${petName} 的寄养需求`,
            heroSub,
            tagList: tagList.length ? tagList : ['寄养需求'],
            photoSectionTitle: '需求摘要',
            photoCells: buildPhotoCells(doc, 'request'),
            descSectionTitle: '需求描述',
            descText: desc,
          })
        }
      })
      .catch(() => {
        this.setData({ loading: false, loadError: '网络异常，请稍后重试' })
      })
  },

  goContact() {
    if (!ensureLoggedIn(this.detailRedirectPath())) {
      return
    }
    const { listingId, listingType, heroName } = this.data
    if (!listingId) {
      return
    }
    const url = `/pages/contact/contact?id=${encodeURIComponent(listingId)}&type=${encodeURIComponent(
      listingType
    )}&title=${encodeURIComponent(heroName || '')}`
    const ids = SUBSCRIBE_MESSAGE_TEMPLATE_IDS.filter(Boolean).slice(0, 3)
    const go = () => {
      wx.navigateTo({ url })
    }
    if (ids.length > 0) {
      wx.requestSubscribeMessage({
        tmplIds: ids,
        complete: go,
        fail: go,
      })
    } else {
      go()
    }
  },
  goReport() {
    if (!ensureLoggedIn(this.detailRedirectPath())) {
      return
    }
    const { listingId, listingType, heroName } = this.data
    if (!listingId) {
      return
    }
    wx.navigateTo({
      url: `/pages/report/report?id=${encodeURIComponent(listingId)}&type=${encodeURIComponent(
        listingType
      )}&title=${encodeURIComponent(heroName || '')}`,
    })
  },
  onFavorite() {
    if (!ensureLoggedIn(this.detailRedirectPath())) {
      return
    }
    const { listingId, listingType, heroName } = this.data
    if (!listingId) {
      return
    }
    callCloud('addFavorite', {
      listingId,
      listingType,
      titleCache: heroName || '',
    })
      .then((res) => {
        const r = res.result as { ok?: boolean; duplicate?: boolean; errMsg?: string }
        if (!r || !r.ok) {
          wx.showToast({ title: (r && r.errMsg) || '收藏失败', icon: 'none' })
          return
        }
        wx.showToast({ title: r.duplicate ? '已在收藏中' : '已加入收藏', icon: 'success' })
      })
      .catch(() => {
        wx.showToast({ title: '网络异常', icon: 'none' })
      })
  },
  goHome() {
    wx.reLaunch({ url: '/pages/home/home' })
  },
  goPublish() {
    wx.reLaunch({ url: '/pages/publish/publish' })
  },
  goMy() {
    wx.reLaunch({ url: '/pages/my/my' })
  },
  goMap() {
    wx.reLaunch({ url: '/pages/map/map' })
  },
})
