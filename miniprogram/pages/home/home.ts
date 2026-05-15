import { refreshMessageBadge } from '../../utils/inboxBadge'
import {
  distanceLabelFromDoc,
  feedLocationHint,
  loadPublishedFeed,
  type FeedCloudDoc,
  type FeedSearchMode,
} from '../../utils/feedLoad'

type PhotoSlot = { slotIdx: number; url: string }

type HomeFeedCard = {
  _id: string
  id: string
  name: string
  distance: string
  tags: string[]
  photoSlots: PhotoSlot[]
  desc: string
  listType: 'provider' | 'request'
}

function pickImageUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter(
    (u): u is string =>
      typeof u === 'string' &&
      (/^https?:\/\//.test(u) || /^cloud:\/\//.test(u))
  )
}

function buildThreePhotoSlots(urls: string[]): PhotoSlot[] {
  const slice = urls.slice(0, 3)
  return [0, 1, 2].map((slotIdx) => ({
    slotIdx,
    url: slice[slotIdx] || '',
  }))
}

function mapProviderToCard(doc: FeedCloudDoc, searchMode: FeedSearchMode): HomeFeedCard {
  const tags = (doc.service_tags as string[]) || []
  const tagSlice = tags.slice(0, 4)
  const urls = pickImageUrls(doc.environment_photos)
  return {
    _id: doc._id as string,
    id: doc._id as string,
    name: (doc.display_name as string) || '寄养家庭',
    distance: distanceLabelFromDoc(doc, searchMode),
    tags: tagSlice.length ? tagSlice : ['家庭寄养'],
    photoSlots: buildThreePhotoSlots(urls),
    desc: (doc.env_description as string) || (doc.service_summary as string) || '欢迎了解',
    listType: 'provider',
  }
}

function mapRequestToCard(doc: FeedCloudDoc, searchMode: FeedSearchMode): HomeFeedCard {
  const petName = (doc.pet_name as string) || '宠物'
  const petType = String(doc.pet_type || '').trim()
  const size = String(doc.size || '').trim()
  const tagSlice = [petType, size].filter(Boolean).slice(0, 4)
  const urls = pickImageUrls(doc.pet_photos)
  return {
    _id: doc._id as string,
    id: doc._id as string,
    name: `${petName} 的寄养需求`,
    distance: distanceLabelFromDoc(doc, searchMode),
    tags: tagSlice.length ? tagSlice : ['寄养需求'],
    photoSlots: buildThreePhotoSlots(urls),
    desc:
      String(doc.description || doc.date_range_text || '').trim() || '欢迎了解',
    listType: 'request',
  }
}

Page({
  data: {
    feedType: 'provider' as 'provider' | 'request',
    providers: [] as HomeFeedCard[],
    requests: [] as HomeFeedCard[],
    cityInput: '',
    activeCityQuery: '',
    searchMode: 'all' as FeedSearchMode,
    feedLocated: false,
    locationHint: '未定位，可搜索市区',
    loading: false,
    empty: false,
    msgUnread: 0,
  },

  onShow() {
    refreshMessageBadge(this)
    this.loadFeed()
  },

  switchFeedType(e: WechatMiniprogram.BaseEvent) {
    const feedType = e.currentTarget.dataset.type as 'provider' | 'request'
    if (feedType !== 'provider' && feedType !== 'request') {
      return
    }
    this.setData({ feedType })
  },

  onCityInput(e: WechatMiniprogram.Input) {
    this.setData({ cityInput: e.detail.value })
  },

  onCitySearch() {
    const q = this.data.cityInput.trim()
    this.setData({ activeCityQuery: q }, () => this.loadFeed())
  },

  onClearCity() {
    this.setData({ cityInput: '', activeCityQuery: '' }, () => this.loadFeed())
  },

  loadFeed() {
    this.setData({ loading: true })
    const cityQuery = this.data.activeCityQuery || undefined
    loadPublishedFeed({ cityQuery })
      .then((r) => {
        if (!r.ok) {
          this.setData({
            providers: [],
            requests: [],
            empty: true,
            loading: false,
            searchMode: 'all',
            feedLocated: false,
            locationHint: '未定位，可搜索市区',
          })
          return
        }
        const searchMode = r.searchMode
        const providers = r.providers.map((doc) => mapProviderToCard(doc, searchMode))
        const requests = r.requests.map((doc) => mapRequestToCard(doc, searchMode))
        this.setData({
          providers,
          requests,
          searchMode,
          feedLocated: r.located,
          locationHint: feedLocationHint(r),
          empty: providers.length === 0 && requests.length === 0,
          loading: false,
        })
      })
      .catch(() => {
        this.setData({
          providers: [],
          requests: [],
          empty: true,
          loading: false,
          searchMode: 'all',
          feedLocated: false,
          locationHint: '未定位，可搜索市区',
        })
      })
  },

  goDetail(e: WechatMiniprogram.TouchEvent) {
    const id = (e.currentTarget.dataset as { id?: string }).id
    const type = (e.currentTarget.dataset as { type?: string }).type || 'provider'
    if (!id) {
      return
    }
    wx.navigateTo({
      url: `/pages/detail/detail?id=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}`,
    })
  },
  goPublish() {
    wx.reLaunch({
      url: '/pages/publish/publish',
    })
  },
  goHome() {},
  goMy() {
    wx.reLaunch({
      url: '/pages/my/my',
    })
  },
  goMap() {
    wx.reLaunch({
      url: '/pages/map/map',
    })
  },
})
