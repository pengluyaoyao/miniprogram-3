import { refreshMessageBadge } from '../../utils/inboxBadge'
import {
  feedLocationHint,
  loadPublishedFeed,
  type FeedCloudDoc,
  type FeedSearchMode,
} from '../../utils/feedLoad'
import {
  buildWaterfallColumns,
  coverPaddingFromAspectRatio,
  mapProviderToWaterfall,
  mapRequestToWaterfall,
  recalcCardHeight,
  resolveWaterfallCoverUrls,
  type WaterfallCard,
} from '../../utils/feedCover'

let rawProvidersCache: FeedCloudDoc[] = []
let rawRequestsCache: FeedCloudDoc[] = []
let layoutCardsCache: WaterfallCard[] = []
let relayoutTimer: ReturnType<typeof setTimeout> | null = null

Page({
  data: {
    feedType: 'provider' as 'provider' | 'request',
    leftColumn: [] as WaterfallCard[],
    rightColumn: [] as WaterfallCard[],
    listCount: 0,
    cityInput: '',
    activeCityQuery: '',
    searchMode: 'all' as FeedSearchMode,
    locationHint: '全部 · 各最多 50 条',
    loading: false,
    empty: false,
    msgUnread: 0,
    scrollViewHeight: 400,
  },

  onReady() {
    this.measureScrollHeight()
  },

  onShow() {
    refreshMessageBadge(this)
    this.loadFeed()
  },

  measureScrollHeight() {
    if (this.data.loading || this.data.empty || this.data.listCount === 0) {
      return
    }
    const sys = wx.getSystemInfoSync()
    const safeBottom = sys.safeArea ? sys.screenHeight - sys.safeArea.bottom : 0
    const tabBarPx = (100 * sys.windowWidth) / 750 + safeBottom
    const q = this.createSelectorQuery()
    q.select('.page-top').boundingClientRect()
    q.select('.page-above-scroll').boundingClientRect()
    q.exec((res) => {
      const topBottom = res[1]?.bottom ?? res[0]?.bottom ?? 0
      const height = sys.windowHeight - topBottom - tabBarPx
      this.setData({ scrollViewHeight: Math.max(240, Math.floor(height)) })
    })
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

  switchFeedType(e: WechatMiniprogram.BaseEvent) {
    const feedType = e.currentTarget.dataset.type as 'provider' | 'request'
    if (feedType !== 'provider' && feedType !== 'request') {
      return
    }
    this.setData({ feedType }, () => {
      this.applyWaterfallForType()
      wx.nextTick(() => this.measureScrollHeight())
    })
  },

  applyWaterfallForType() {
    const docs = this.data.feedType === 'provider' ? rawProvidersCache : rawRequestsCache
    const cards = docs.map((doc) =>
      this.data.feedType === 'provider'
        ? mapProviderToWaterfall(doc)
        : mapRequestToWaterfall(doc)
    )
    this.layoutWaterfall(cards)
  },

  publishWaterfallColumns() {
    const { leftColumn, rightColumn } = buildWaterfallColumns(layoutCardsCache)
    this.setData(
      {
        leftColumn,
        rightColumn,
        listCount: layoutCardsCache.length,
      },
      () => wx.nextTick(() => this.measureScrollHeight())
    )
  },

  scheduleRelayout() {
    if (relayoutTimer) {
      clearTimeout(relayoutTimer)
    }
    relayoutTimer = setTimeout(() => {
      relayoutTimer = null
      this.publishWaterfallColumns()
    }, 80)
  },

  layoutWaterfall(cards: WaterfallCard[]) {
    resolveWaterfallCoverUrls(cards).then((resolved) => {
      layoutCardsCache = resolved.map((c) => recalcCardHeight(c))
      this.publishWaterfallColumns()
    })
  },

  onCoverImageLoad(e: WechatMiniprogram.ImageLoad) {
    const id = (e.currentTarget.dataset as { id?: string }).id
    const w = e.detail.width
    const h = e.detail.height
    if (!id || !w || !h) {
      return
    }
    const idx = layoutCardsCache.findIndex((c) => c.id === id)
    if (idx < 0) {
      return
    }
    const nextPct = coverPaddingFromAspectRatio(h / w)
    const cur = layoutCardsCache[idx]
    if (Math.abs(cur.coverPaddingPercent - nextPct) < 4) {
      return
    }
    layoutCardsCache[idx] = recalcCardHeight({
      ...cur,
      coverPaddingPercent: nextPct,
    })
    this.scheduleRelayout()
  },

  loadFeed() {
    this.setData({ loading: true })
    const cityQuery = this.data.activeCityQuery || undefined
    loadPublishedFeed({ cityQuery })
      .then((r) => {
        if (!r.ok) {
          rawProvidersCache = []
          rawRequestsCache = []
          layoutCardsCache = []
          this.setData({
            leftColumn: [],
            rightColumn: [],
            listCount: 0,
            empty: true,
            loading: false,
            searchMode: cityQuery ? 'city' : 'all',
            locationHint: feedLocationHint(cityQuery ? 'city' : 'all', cityQuery || ''),
          })
          return
        }
        rawProvidersCache = r.providers
        rawRequestsCache = r.requests
        const empty = r.providers.length === 0 && r.requests.length === 0
        this.setData(
          {
            searchMode: r.searchMode,
            locationHint: feedLocationHint(r.searchMode, r.cityQuery),
            empty,
            loading: false,
          },
          () => {
            if (!empty) {
              this.applyWaterfallForType()
            } else {
              layoutCardsCache = []
              this.setData({ leftColumn: [], rightColumn: [], listCount: 0 })
            }
          }
        )
      })
      .catch(() => {
        rawProvidersCache = []
        rawRequestsCache = []
        layoutCardsCache = []
        this.setData({
          leftColumn: [],
          rightColumn: [],
          listCount: 0,
          empty: true,
          loading: false,
          searchMode: 'all',
          locationHint: '加载失败，请重试',
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
})
