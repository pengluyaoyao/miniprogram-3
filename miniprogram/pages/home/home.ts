import { callCloud } from '../../utils/cloud'
import { refreshMessageBadge } from '../../utils/inboxBadge'

type CloudDoc = Record<string, unknown>

type HomeFeedCard = {
  _id: string
  id: string
  name: string
  distance: string
  tags: string[]
  photos: string[]
  desc: string
  listType: 'provider' | 'request'
}

function mapProviderToCard(doc: CloudDoc): HomeFeedCard {
  const tags = (doc.service_tags as string[]) || []
  const tagSlice = tags.slice(0, 4)
  const envPhotos = (doc.environment_photos as string[]) || []
  const photos = envPhotos.length
    ? envPhotos.slice(0, 3).map((_u: string, i: number) => `图${i + 1}`)
    : ['环境照', '待上传', '简介']
  return {
    _id: doc._id as string,
    id: doc._id as string,
    name: (doc.display_name as string) || '寄养家庭',
    distance: '附近',
    tags: tagSlice.length ? tagSlice : ['家庭寄养'],
    photos,
    desc: (doc.env_description as string) || (doc.service_summary as string) || '欢迎了解',
    listType: 'provider',
  }
}

function mapRequestToCard(doc: CloudDoc): HomeFeedCard {
  const petName = (doc.pet_name as string) || '宠物'
  const petType = String(doc.pet_type || '').trim()
  const size = String(doc.size || '').trim()
  const tagSlice = [petType, size].filter(Boolean).slice(0, 4)
  return {
    _id: doc._id as string,
    id: doc._id as string,
    name: `${petName} 的寄养需求`,
    distance: '附近',
    tags: tagSlice.length ? tagSlice : ['寄养需求'],
    photos: ['需求', '概要', '示意'],
    desc:
      String(doc.description || doc.date_range_text || '').trim() || '欢迎了解',
    listType: 'request',
  }
}

Page({
  data: {
    providers: [] as HomeFeedCard[],
    requests: [] as HomeFeedCard[],
    loading: false,
    empty: false,
    msgUnread: 0,
  },

  onShow() {
    refreshMessageBadge(this)
    this.loadFeed()
  },

  loadFeed() {
    this.setData({ loading: true })
    callCloud('getPublishedFeed')
      .then((res) => {
        const r = res.result as {
          ok?: boolean
          providers?: CloudDoc[]
          requests?: CloudDoc[]
          errMsg?: string
        }
        if (r && r.ok) {
          const provDocs = Array.isArray(r.providers) ? r.providers : []
          const reqDocs = Array.isArray(r.requests) ? r.requests : []
          const providers = provDocs.map((doc) => mapProviderToCard(doc))
          const requests = reqDocs.map((doc) => mapRequestToCard(doc))
          this.setData({
            providers,
            requests,
            empty: providers.length === 0 && requests.length === 0,
            loading: false,
          })
        } else {
          this.setData({
            providers: [],
            requests: [],
            empty: true,
            loading: false,
          })
        }
      })
      .catch(() => {
        this.setData({ providers: [], requests: [], empty: true, loading: false })
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
