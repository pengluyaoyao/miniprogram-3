import { loadPublishedFeed, feedLocationHint, mapCenterFromDocs, type FeedCloudDoc } from '../../utils/feedLoad'
import { quantizeLocationRough } from '../../utils/location'
import { refreshMessageBadge } from '../../utils/inboxBadge'

type CloudDoc = FeedCloudDoc

const DEFAULT_LAT = 31.2304
const DEFAULT_LNG = 121.4737

type MapEntry = {
  doc: CloudDoc
  idStr: string
  rawLat: number
  rawLng: number
  title: string
  desc: string
  kind: 'provider' | 'request'
}

type ListRow = {
  listingId: string
  listingType: 'provider' | 'request'
  markerId: number
  title: string
  subtitle: string
  selected: boolean
}

function markerIdFromString(s: string, salt: number): number {
  let h = salt
  const str = String(s || '')
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(h) % 900000 + 1
}

function groupKeyFromRaw(lat: number, lng: number): string {
  const q = quantizeLocationRough(lat, lng)
  return `${q.lat},${q.lng}`
}

/** 同网格内多条记录环形错开，避免标点完全重叠 */
function spreadOffset(index: number, total: number): { dLat: number; dLng: number } {
  if (total <= 1) {
    return { dLat: 0, dLng: 0 }
  }
  const radiusDeg = 0.0011
  const angle = (2 * Math.PI * index) / total
  return { dLat: radiusDeg * Math.cos(angle), dLng: radiusDeg * Math.sin(angle) }
}

function buildEntries(docs: CloudDoc[], kind: 'provider' | 'request', baseLat: number, baseLng: number): MapEntry[] {
  return docs.map((doc, i) => {
    const idStr = (doc._id as string) || `${kind}_${i}`
    const rawLat =
      typeof doc.lat === 'number' && !Number.isNaN(doc.lat as number)
        ? (doc.lat as number)
        : baseLat + i * 0.004 - 0.01
    const rawLng =
      typeof doc.lng === 'number' && !Number.isNaN(doc.lng as number)
        ? (doc.lng as number)
        : baseLng + i * 0.004 - 0.01

    let title = ''
    let desc = ''
    if (kind === 'provider') {
      title = ((doc.display_name as string) || '寄养家庭').slice(0, 18)
      desc = ((doc.env_description as string) || (doc.service_summary as string) || '').slice(0, 80)
    } else {
      title = `${(doc.pet_name as string) || '宠物'} · ${(doc.pet_type as string) || ''}`.slice(0, 18)
      desc = ((doc.description as string) || (doc.date_range_text as string) || '').slice(0, 80)
    }
    const dist = String(doc.distance_label || '').trim()
    const subtitleBase = dist ? `${dist} · ${desc || '查看详情'}` : desc || '查看详情'
    return { doc, idStr, rawLat, rawLng, title, desc: subtitleBase, kind }
  })
}

function buildMarkersAndList(
  docs: CloudDoc[],
  kind: 'provider' | 'request',
  baseLat: number,
  baseLng: number
): {
  markers: WechatMiniprogram.MapMarker[]
  meta: Record<number, { title: string; desc: string; listingId: string; listingType: 'provider' | 'request' }>
  listRows: ListRow[]
} {
  const entries = buildEntries(docs, kind, baseLat, baseLng)
  const groups = new Map<string, MapEntry[]>()
  entries.forEach((e) => {
    const k = groupKeyFromRaw(e.rawLat, e.rawLng)
    if (!groups.has(k)) {
      groups.set(k, [])
    }
    groups.get(k)!.push(e)
  })

  const meta: Record<
    number,
    { title: string; desc: string; listingId: string; listingType: 'provider' | 'request' }
  > = {}
  const markers: WechatMiniprogram.MapMarker[] = []
  const listRows: ListRow[] = []

  entries.forEach((e, orderIdx) => {
    const k = groupKeyFromRaw(e.rawLat, e.rawLng)
    const g = groups.get(k)!
    const idxInGroup = g.indexOf(e)
    const q = quantizeLocationRough(e.rawLat, e.rawLng)
    const spread = spreadOffset(idxInGroup, g.length)
    const dispLat = q.lat + spread.dLat
    const dispLng = q.lng + spread.dLng

    const id = markerIdFromString(e.idStr, kind === 'provider' ? 1000 : 500000)
    meta[id] = {
      title: e.title,
      desc: e.desc,
      listingId: e.idStr,
      listingType: e.kind,
    }
    markers.push({
      id,
      latitude: dispLat,
      longitude: dispLng,
      title: e.title.slice(0, 12),
      width: 28,
      height: 28,
    })
    listRows.push({
      listingId: e.idStr,
      listingType: e.kind,
      markerId: id,
      title: e.title,
      subtitle: e.desc || '查看详情',
      selected: orderIdx === 0,
    })
  })

  return { markers, meta, listRows }
}

Page({
  data: {
    mapType: 'provider' as 'provider' | 'request',
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
    markers: [] as WechatMiniprogram.MapMarker[],
    markersMeta: {} as Record<
      number,
      { title: string; desc: string; listingId: string; listingType: 'provider' | 'request' }
    >,
    listRows: [] as ListRow[],
    selectedListingId: '',
    selectedListingType: 'provider' as 'provider' | 'request',
    previewTitle: '点击地图标注查看',
    previewDesc: '展示已发布内容摘要',
    rawProviders: [] as CloudDoc[],
    rawRequests: [] as CloudDoc[],
    cityInput: '',
    activeCityQuery: '',
    searchMode: 'all' as 'gps' | 'city' | 'all',
    feedLocated: false,
    locationHint: '未定位，可搜索市区',
    msgUnread: 0,
  },

  onLoad() {
    this.loadFeed()
  },

  onShow() {
    refreshMessageBadge(this)
    this.loadFeed()
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
    const cityQuery = this.data.activeCityQuery || undefined
    loadPublishedFeed({ cityQuery })
      .then((r) => {
        if (!r.ok) {
          this.setData(
            {
              rawProviders: [],
              rawRequests: [],
              searchMode: 'all',
              feedLocated: false,
              locationHint: '未定位，可搜索市区',
            },
            () => this.setMarkersForType(this.data.mapType)
          )
          return
        }
        const patch: Record<string, unknown> = {
          rawProviders: r.providers,
          rawRequests: r.requests,
          searchMode: r.searchMode,
          feedLocated: r.located,
          locationHint: feedLocationHint(r),
        }
        if (r.searchMode === 'gps' && r.userLat != null && r.userLng != null) {
          patch.lat = r.userLat
          patch.lng = r.userLng
        } else if (r.searchMode === 'city') {
          const center = mapCenterFromDocs([...r.providers, ...r.requests])
          if (center) {
            patch.lat = center.lat
            patch.lng = center.lng
          }
        }
        this.setData(patch, () => this.setMarkersForType(this.data.mapType))
      })
      .catch(() => {
        this.setData({ rawProviders: [], rawRequests: [] }, () => {
          this.setMarkersForType(this.data.mapType)
        })
      })
  },

  switchType(e: WechatMiniprogram.BaseEvent) {
    const mapType = e.currentTarget.dataset.type as 'provider' | 'request'
    this.setData({ mapType })
    this.setMarkersForType(mapType)
  },

  applyListSelection(listRows: ListRow[], selectedId: string) {
    return listRows.map((row) => ({
      ...row,
      selected: row.listingId === selectedId,
    }))
  },

  setMarkersForType(mapType: string) {
    const baseLat = this.data.lat
    const baseLng = this.data.lng
    const docs = mapType === 'provider' ? this.data.rawProviders : this.data.rawRequests
    const kind = mapType === 'provider' ? 'provider' : 'request'
    const { markers, meta, listRows } = buildMarkersAndList(docs, kind, baseLat, baseLng)
    const first = listRows[0]
    const firstMeta = first ? meta[first.markerId] : null
    this.setData({
      markers,
      markersMeta: meta,
      listRows,
      previewTitle: firstMeta ? firstMeta.title : '暂无标点',
      previewDesc: firstMeta ? firstMeta.desc : '请先发布对应类型信息',
      selectedListingId: first ? first.listingId : '',
      selectedListingType: first ? first.listingType : (kind as 'provider' | 'request'),
    })
  },

  syncPreviewFromMeta(markerId: number) {
    const m = this.data.markersMeta[markerId]
    if (!m) {
      return
    }
    const listRows = this.applyListSelection(this.data.listRows, m.listingId)
    this.setData({
      previewTitle: m.title,
      previewDesc: m.desc,
      selectedListingId: m.listingId,
      selectedListingType: m.listingType,
      listRows,
    })
  },

  onMarkerTap(e: WechatMiniprogram.MapMarkerTap) {
    const mid = e.detail.markerId
    this.syncPreviewFromMeta(mid)
  },

  onListRowTap(e: WechatMiniprogram.BaseEvent) {
    const mid = Number((e.currentTarget.dataset as { mid?: string }).mid)
    if (!Number.isFinite(mid)) {
      return
    }
    const mk = this.data.markers.find((m) => m.id === mid)
    this.syncPreviewFromMeta(mid)
    if (mk) {
      this.setData({ lat: mk.latitude, lng: mk.longitude })
    }
  },

  goDetail() {
    const { selectedListingId, selectedListingType } = this.data
    if (!selectedListingId) {
      wx.showToast({ title: '请先选择一条信息', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/detail/detail?id=${encodeURIComponent(selectedListingId)}&type=${encodeURIComponent(
        selectedListingType
      )}`,
    })
  },

  goHome() {
    wx.reLaunch({ url: '/pages/home/home' })
  },
  goPublish() {
    wx.reLaunch({ url: '/pages/publish/publish' })
  },
  goMap() {},
  goMy() {
    wx.reLaunch({ url: '/pages/my/my' })
  },
})
