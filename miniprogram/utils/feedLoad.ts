import { callCloud } from './cloud'
import type { FeedCloudDoc } from './feedLoadTypes'

export type { FeedCloudDoc } from './feedLoadTypes'

export type FeedSearchMode = 'all' | 'city'

export type PublishedFeedResult = {
  ok: boolean
  providers: FeedCloudDoc[]
  requests: FeedCloudDoc[]
  searchMode: FeedSearchMode
  cityQuery: string
  errMsg?: string
}

export type LoadFeedOptions = {
  /** 有值时按 location_city 子串筛选；无值则各返回最多 50 条 */
  cityQuery?: string
}

function parseCloudResult(
  res: WechatMiniprogram.ICloud.CallFunctionResult,
  cityQuery: string
): PublishedFeedResult {
  const r = res.result as {
    ok?: boolean
    providers?: FeedCloudDoc[]
    requests?: FeedCloudDoc[]
    searchMode?: FeedSearchMode
    cityQuery?: string
    errMsg?: string
  }
  if (!r || !r.ok) {
    return {
      ok: false,
      providers: [],
      requests: [],
      searchMode: cityQuery ? 'city' : 'all',
      cityQuery,
      errMsg: (r && r.errMsg) || '加载失败',
    }
  }
  return {
    ok: true,
    providers: Array.isArray(r.providers) ? r.providers : [],
    requests: Array.isArray(r.requests) ? r.requests : [],
    searchMode: r.searchMode === 'city' ? 'city' : 'all',
    cityQuery: r.cityQuery || cityQuery,
  }
}

/** 默认各最多 50 条；传 cityQuery 时按市区筛选，均不按距离排序 */
export function loadPublishedFeed(options?: LoadFeedOptions): Promise<PublishedFeedResult> {
  const cityQuery = (options?.cityQuery || '').trim()
  return callCloud('getPublishedFeed', { cityQuery }).then((cloudRes) =>
    parseCloudResult(cloudRes, cityQuery)
  )
}

export function feedLocationHint(searchMode: FeedSearchMode, cityQuery: string): string {
  if (searchMode === 'city' && cityQuery) {
    return `筛选「${cityQuery}」`
  }
  return '全部 · 各最多 50 条'
}

/** 卡片上展示的市区文案 */
export function locationLabelFromDoc(doc: FeedCloudDoc): string {
  const label = String(doc.distance_label || doc.location_city || '').trim()
  return label.slice(0, 16) || '未填市区'
}

/** 预留：地图页下线后未使用；取列表中第一条有效坐标 */
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
