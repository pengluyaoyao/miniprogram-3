import { callCloud } from './cloud'
import { getLocationCoarse, quantizeLocationRough } from './location'

export type FeedCloudDoc = { [key: string]: unknown }

export type FeedSearchMode = 'gps' | 'city' | 'all'

export type PublishedFeedResult = {
  ok: boolean
  providers: FeedCloudDoc[]
  requests: FeedCloudDoc[]
  searchMode: FeedSearchMode
  located: boolean
  cityQuery: string
  userLat: number | null
  userLng: number | null
  errMsg?: string
}

export type LoadFeedOptions = {
  /** 有值时按市区字段筛选，优先于 GPS */
  cityQuery?: string
}

function parseCloudResult(
  res: WechatMiniprogram.ICloud.CallFunctionResult,
  fallback: Pick<PublishedFeedResult, 'searchMode' | 'located' | 'cityQuery' | 'userLat' | 'userLng'>
): PublishedFeedResult {
  const r = res.result as {
    ok?: boolean
    providers?: FeedCloudDoc[]
    requests?: FeedCloudDoc[]
    searchMode?: FeedSearchMode
    located?: boolean
    cityQuery?: string
    errMsg?: string
  }
  if (!r || !r.ok) {
    return {
      ok: false,
      providers: [],
      requests: [],
      searchMode: 'all',
      located: false,
      cityQuery: '',
      userLat: null,
      userLng: null,
      errMsg: (r && r.errMsg) || '加载失败',
    }
  }
  return {
    ok: true,
    providers: Array.isArray(r.providers) ? r.providers : [],
    requests: Array.isArray(r.requests) ? r.requests : [],
    searchMode: r.searchMode || fallback.searchMode,
    located: typeof r.located === 'boolean' ? r.located : fallback.located,
    cityQuery: r.cityQuery || fallback.cityQuery,
    userLat: fallback.userLat,
    userLng: fallback.userLng,
  }
}

/** GPS：50km 内按距离；市区搜索：按 location_city 匹配（含无坐标记录）；否则全量各最多 50 条 */
export function loadPublishedFeed(options?: LoadFeedOptions): Promise<PublishedFeedResult> {
  const city = options?.cityQuery?.trim()
  if (city) {
    return callCloud('getPublishedFeed', { cityQuery: city }).then((cloudRes) =>
      parseCloudResult(cloudRes, {
        searchMode: 'city',
        located: false,
        cityQuery: city,
        userLat: null,
        userLng: null,
      })
    )
  }

  return getLocationCoarse()
    .then((res) => {
      const q = quantizeLocationRough(res.latitude, res.longitude)
      return callCloud('getPublishedFeed', { lat: q.lat, lng: q.lng }).then((cloudRes) =>
        parseCloudResult(cloudRes, {
          searchMode: 'gps',
          located: true,
          cityQuery: '',
          userLat: q.lat,
          userLng: q.lng,
        })
      )
    })
    .catch(() =>
      callCloud('getPublishedFeed', {}).then((cloudRes) =>
        parseCloudResult(cloudRes, {
          searchMode: 'all',
          located: false,
          cityQuery: '',
          userLat: null,
          userLng: null,
        })
      )
    )
}

export function feedLocationHint(r: Pick<PublishedFeedResult, 'searchMode' | 'cityQuery'>): string {
  if (r.searchMode === 'city' && r.cityQuery) {
    return `按「${r.cityQuery}」筛选`
  }
  if (r.searchMode === 'gps') {
    return '50km 内 · 按距离排序'
  }
  return '未定位，可搜索市区'
}

export function distanceLabelFromDoc(doc: FeedCloudDoc, searchMode: FeedSearchMode): string {
  if (searchMode === 'gps') {
    const label = String(doc.distance_label || '').trim()
    return label
  }
  if (searchMode === 'city') {
    return String(doc.location_city || '').trim().slice(0, 12) || '同城'
  }
  return '附近'
}

/** 从列表中取第一个有效坐标，用于地图居中 */
export function mapCenterFromDocs(docs: FeedCloudDoc[]): { lat: number; lng: number } | null {
  for (const doc of docs) {
    const lat = typeof doc.lat === 'number' ? doc.lat : Number(doc.lat)
    const lng = typeof doc.lng === 'number' ? doc.lng : Number(doc.lng)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng }
    }
  }
  return null
}
