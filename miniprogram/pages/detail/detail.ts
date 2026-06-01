import { ensureLoggedIn } from '../../utils/auth'
import { callCloud } from '../../utils/cloud'
import { formatBoardingRangeLabel } from '../../utils/boardingPeriod'
import { resolvePhotoCells } from '../../utils/cloudImages'
import { refreshMessageBadge } from '../../utils/inboxBadge'
import { requestNewMessageSubscribe } from '../../constants/subscribeMessage'

type CloudDoc = Record<string, unknown>

type PhotoCell = { url?: string; label: string; idx: number }
type InfoRow = { label: string; value: string }

function isPhotoUrl(u: unknown): u is string {
  return (
    typeof u === 'string' &&
    (/^https?:\/\//.test(u) || /^cloud:\/\//.test(u))
  )
}

function pushInfoRow(rows: InfoRow[], label: string, value: unknown) {
  const v = String(value ?? '').trim()
  if (v) {
    rows.push({ label, value: v })
  }
}

function formatPetTypes(types: unknown): string {
  const list = Array.isArray(types) ? types.map((t) => String(t).trim()).filter(Boolean) : []
  if (!list.length) {
    return ''
  }
  const map: Record<string, string> = {
    dog: '狗',
    cat: '猫',
    small: '小型',
    medium: '中型',
    large: '大型',
  }
  return list.map((t) => map[t] || t).join('、')
}

const PROVIDER_STANDARD_SERVICES = ['喂药', '接送', '视频', '摄像头'] as const

function providerStandardServiceTags(doc: CloudDoc): string[] {
  const all = ((doc.service_tags as string[]) || []).map((t) => String(t).trim()).filter(Boolean)
  return PROVIDER_STANDARD_SERVICES.filter((s) => all.includes(s))
}

function providerOtherServiceTags(doc: CloudDoc): string[] {
  const all = ((doc.service_tags as string[]) || []).map((t) => String(t).trim()).filter(Boolean)
  const standard = new Set<string>(PROVIDER_STANDARD_SERVICES)
  return all.filter((t) => !standard.has(t) && t !== '家庭寄养')
}

function buildProviderInfoRows(doc: CloudDoc): InfoRow[] {
  const rows: InfoRow[] = []
  pushInfoRow(rows, '寄养家庭名称', doc.display_name)
  pushInfoRow(rows, '所在市区', doc.location_city)
  const years = Number(doc.years_experience) || 0
  if (years > 0) {
    pushInfoRow(rows, '服务经验', `${years} 年`)
  }
  const pets = formatPetTypes(doc.pet_types)
  if (pets) {
    pushInfoRow(rows, '可接收宠物', pets)
  }
  const serviceItems = providerStandardServiceTags(doc)
  if (serviceItems.length) {
    pushInfoRow(rows, '服务项目', serviceItems.join('、'))
  }
  const otherServices = providerOtherServiceTags(doc)
  if (otherServices.length) {
    pushInfoRow(rows, '其他服务', otherServices.join('、'))
  }
  const tags = ((doc.service_tags as string[]) || []).map((t) => String(t).trim()).filter(Boolean)
  const summary = String(doc.service_summary || '').trim()
  const tagLine = tags.join('、')
  if (summary && summary !== tagLine) {
    pushInfoRow(rows, '服务说明', summary)
  }
  const envDesc = String(doc.env_description || '').trim()
  if (envDesc && envDesc !== '详见上传的环境照片') {
    pushInfoRow(rows, '环境说明', envDesc)
  }
  pushInfoRow(rows, '价格说明', doc.price_description || '价格线下沟通确认，平台不收款')
  pushInfoRow(rows, '手机号', doc.phone)
  pushInfoRow(rows, '微信号', doc.wechat_id)
  pushInfoRow(rows, '社交账号', doc.social_accounts)
  return rows
}

function buildRequestInfoRows(doc: CloudDoc): InfoRow[] {
  const rows: InfoRow[] = []
  pushInfoRow(rows, '宠物昵称', doc.pet_name)
  pushInfoRow(rows, '宠物类型', doc.pet_type)
  pushInfoRow(rows, '体型', doc.size)
  const period =
    formatBoardingRangeLabel(String(doc.start_date || ''), String(doc.end_date || '')) ||
    String(doc.date_range_text || '').trim()
  pushInfoRow(rows, '寄养时间', period)
  pushInfoRow(rows, '所在市区', doc.location_city)
  const req = ((doc.requirements as string[]) || []).map((t) => String(t).trim()).filter(Boolean)
  if (req.length) {
    pushInfoRow(rows, '其他要求', req.join('；'))
  }
  pushInfoRow(rows, '需求描述', doc.description)
  pushInfoRow(rows, '手机号', doc.phone)
  pushInfoRow(rows, '微信号', doc.wechat_id)
  pushInfoRow(rows, '社交账号', doc.social_accounts)
  return rows
}

function buildPhotoCells(doc: CloudDoc, listingType: 'provider' | 'request'): PhotoCell[] {
  if (listingType === 'provider') {
    const urls = ((doc.environment_photos as string[]) || []).filter(isPhotoUrl)
    if (urls.length) {
      return urls.slice(0, 9).map((url, i) => ({ url, label: '', idx: i }))
    }
    return []
  }
  const urls = ((doc.pet_photos as string[]) || []).filter(isPhotoUrl)
  if (urls.length) {
    return urls.slice(0, 3).map((url, i) => ({ url, label: '', idx: i }))
  }
  return []
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
    photoPreviewUrls: [] as string[],
    infoRows: [] as InfoRow[],
    showInfoSection: false,
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
        loadError: '链接缺少信息，请从首页进入',
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
          const tagList = providerStandardServiceTags(doc)
          const city = String(doc.location_city || '').trim()
          const heroSub = [city, years > 0 ? `经验 ${years} 年` : ''].filter(Boolean).join(' · ') || '寄养家庭'
          const infoRows = buildProviderInfoRows(doc)
          const photoCells = buildPhotoCells(doc, 'provider')
          resolvePhotoCells(photoCells).then((cells) => {
            const photoPreviewUrls = cells.map((c) => c.url).filter((u): u is string => !!u)
            this.setData({
              loading: false,
              loadError: '',
              listingType: 'provider',
              pageTitle: '寄养家庭详情',
              heroName: String(doc.display_name || '寄养家庭'),
              heroSub,
              tagList,
              photoSectionTitle: '寄养环境照片',
              photoCells: cells,
              photoPreviewUrls,
              infoRows,
              showInfoSection: infoRows.length > 0,
              descSectionTitle: '',
              descText: '',
            })
          })
        } else {
          const petName = String(doc.pet_name || '宠物')
          const petType = String(doc.pet_type || '')
          const size = String(doc.size || '')
          const period =
            formatBoardingRangeLabel(
              String(doc.start_date || ''),
              String(doc.end_date || '')
            ) || String(doc.date_range_text || '').trim()
          const city = String(doc.location_city || '').trim()
          const heroSub = [period, city].filter(Boolean).join(' · ') || '宠主寄养需求'
          const req = (doc.requirements as string[]) || []
          const tagList = [petType, size, ...req].map((t) => String(t).trim()).filter(Boolean).slice(0, 8)
          const infoRows = buildRequestInfoRows(doc)
          const photoCells = buildPhotoCells(doc, 'request')
          resolvePhotoCells(photoCells).then((cells) => {
            const photoPreviewUrls = cells.map((c) => c.url).filter((u): u is string => !!u)
            this.setData({
              loading: false,
              loadError: '',
              listingType: 'request',
              pageTitle: '宠主需求详情',
              heroName: `${petName} 的寄养需求`,
              heroSub,
              tagList: tagList.length ? tagList : ['寄养需求'],
              photoSectionTitle: '宠物照片',
              photoCells: cells,
              photoPreviewUrls,
              infoRows,
              showInfoSection: infoRows.length > 0,
              descSectionTitle: '',
              descText: '',
            })
          })
        }
      })
      .catch(() => {
        this.setData({ loading: false, loadError: '网络异常，请稍后重试' })
      })
  },

  onPreviewPhoto(e: WechatMiniprogram.BaseEvent) {
    const idx = Number((e.currentTarget.dataset as { idx?: number }).idx) || 0
    const urls = this.data.photoPreviewUrls
    if (!urls.length) {
      return
    }
    wx.previewImage({
      current: urls[idx] || urls[0],
      urls,
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
    requestNewMessageSubscribe().finally(() => {
      wx.navigateTo({ url })
    })
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
})
