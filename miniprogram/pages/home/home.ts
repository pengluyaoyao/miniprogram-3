import { refreshMessageBadge } from '../../utils/inboxBadge'
import {
  feedLocationHint,
  FEED_PAGE_SIZE,
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
let providerHasMore = false
let requestHasMore = false
let providerTotal = 0
let requestTotal = 0
let layoutCardsCache: WaterfallCard[] = []
let relayoutTimer: ReturnType<typeof setTimeout> | null = null
let loadingMore = false

Page({
  data: {
    feedType: 'provider' as 'provider' | 'request',
    leftColumn: [] as WaterfallCard[],
    rightColumn: [] as WaterfallCard[],
    listCount: 0,
    cityInput: '',
    activeCityQuery: '',
    searchMode: 'all' as FeedSearchMode,
    locationHint: '寄养家庭 · 每页 50 条',
    loading: false,
    loadingMore: false,
    hasMore: false,
    feedTotal: 0,
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

  syncFeedMeta() {
    const feedType = this.data.feedType
    const listCount = feedType === 'provider' ? rawProvidersCache.length : rawRequestsCache.length
    const feedTotal = feedType === 'provider' ? providerTotal : requestTotal
    const hasMore = feedType === 'provider' ? providerHasMore : requestHasMore
    this.setData({
      listCount,
      feedTotal,
      hasMore,
      locationHint: feedLocationHint(
        this.data.searchMode,
        this.data.activeCityQuery,
        feedType,
        listCount,
        feedTotal,
        hasMore
      ),
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
      this.syncFeedMeta()
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
      () => {
        this.syncFeedMeta()
        wx.nextTick(() => this.measureScrollHeight())
      }
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

  applyFeedResult(
    r: Awaited<ReturnType<typeof loadPublishedFeed>>,
    append: boolean
  ) {
    if (append) {
      if (this.data.feedType === 'provider') {
        rawProvidersCache = rawProvidersCache.concat(r.providers)
        providerHasMore = r.hasMoreProviders
        providerTotal = r.providerTotal
      } else {
        rawRequestsCache = rawRequestsCache.concat(r.requests)
        requestHasMore = r.hasMoreRequests
        requestTotal = r.requestTotal
      }
    } else {
      rawProvidersCache = r.providers
      rawRequestsCache = r.requests
      providerHasMore = r.hasMoreProviders
      requestHasMore = r.hasMoreRequests
      providerTotal = r.providerTotal
      requestTotal = r.requestTotal
    }

    const empty = rawProvidersCache.length === 0 && rawRequestsCache.length === 0
    this.setData(
      {
        searchMode: r.searchMode,
        empty,
        loading: false,
        loadingMore: false,
      },
      () => {
        loadingMore = false
        if (!empty) {
          this.applyWaterfallForType()
        } else {
          layoutCardsCache = []
          this.setData({ leftColumn: [], rightColumn: [], listCount: 0 })
          this.syncFeedMeta()
        }
      }
    )
  },

  loadFeed() {
    loadingMore = false
    this.setData({ loading: true, loadingMore: false })
    const cityQuery = this.data.activeCityQuery || undefined
    loadPublishedFeed({ cityQuery, skip: 0, limit: FEED_PAGE_SIZE })
      .then((r) => {
        if (!r.ok) {
          rawProvidersCache = []
          rawRequestsCache = []
          layoutCardsCache = []
          providerHasMore = false
          requestHasMore = false
          providerTotal = 0
          requestTotal = 0
          this.setData({
            leftColumn: [],
            rightColumn: [],
            listCount: 0,
            empty: true,
            loading: false,
            loadingMore: false,
            hasMore: false,
            feedTotal: 0,
            searchMode: cityQuery ? 'city' : 'all',
            locationHint: feedLocationHint(
              cityQuery ? 'city' : 'all',
              cityQuery || '',
              this.data.feedType,
              0,
              0,
              false
            ),
          })
          return
        }
        this.applyFeedResult(r, false)
      })
      .catch(() => {
        rawProvidersCache = []
        rawRequestsCache = []
        layoutCardsCache = []
        loadingMore = false
        this.setData({
          leftColumn: [],
          rightColumn: [],
          listCount: 0,
          empty: true,
          loading: false,
          loadingMore: false,
          hasMore: false,
          feedTotal: 0,
          searchMode: 'all',
          locationHint: '加载失败，请重试',
        })
      })
  },

  loadMoreFeed() {
    if (loadingMore || this.data.loading) {
      return
    }
    const feedType = this.data.feedType
    const hasMore = feedType === 'provider' ? providerHasMore : requestHasMore
    if (!hasMore) {
      return
    }

    loadingMore = true
    this.setData({ loadingMore: true })

    const cityQuery = this.data.activeCityQuery || undefined
    const skip =
      feedType === 'provider' ? rawProvidersCache.length : rawRequestsCache.length

    loadPublishedFeed({
      cityQuery,
      skip,
      limit: FEED_PAGE_SIZE,
      listType: feedType,
    })
      .then((r) => {
        if (!r.ok) {
          loadingMore = false
          this.setData({ loadingMore: false })
          wx.showToast({ title: r.errMsg || '加载失败', icon: 'none' })
          return
        }
        this.applyFeedResult(r, true)
      })
      .catch(() => {
        loadingMore = false
        this.setData({ loadingMore: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  onFeedScrollToLower() {
    this.loadMoreFeed()
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
