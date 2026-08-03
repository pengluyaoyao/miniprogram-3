import { callCloud } from './cloud'
import type { FeedCloudDoc } from './feedLoadTypes'

export type { FeedCloudDoc } from './feedLoadTypes'

export type FeedSearchMode = 'all' | 'city'

export const FEED_PAGE_SIZE = 50

export type PublishedFeedResult = {
  ok: boolean
  providers: FeedCloudDoc[]
  requests: FeedCloudDoc[]
  searchMode: FeedSearchMode
  cityQuery: string
  skip: number
  limit: number
  providerTotal: number
  requestTotal: number
  hasMoreProviders: boolean
  hasMoreRequests: boolean
  errMsg?: string
}

export type LoadFeedOptions = {
  /** 有值时按 location_city 子串筛选 */
  cityQuery?: string
  /** 分页偏移，默认 0 */
  skip?: number
  /** 每页条数，默认 50，最大 50 */
  limit?: number
  /** 仅拉取某一类列表（加载更多时使用） */
  listType?: 'provider' | 'request'
}

function parseCloudResult(
  res: WechatMiniprogram.ICloud.CallFunctionResult,
  cityQuery: string,
  skip: number,
  limit: number
): PublishedFeedResult {
  const r = res.result as {
    ok?: boolean
    providers?: FeedCloudDoc[]
    requests?: FeedCloudDoc[]
    searchMode?: FeedSearchMode
    cityQuery?: string
    skip?: number
    limit?: number
    providerTotal?: number
    requestTotal?: number
    hasMoreProviders?: boolean
    hasMoreRequests?: boolean
    errMsg?: string
  }
  if (!r || !r.ok) {
    return {
      ok: false,
      providers: [],
      requests: [],
      searchMode: cityQuery ? 'city' : 'all',
      cityQuery,
      skip,
      limit,
      providerTotal: 0,
      requestTotal: 0,
      hasMoreProviders: false,
      hasMoreRequests: false,
      errMsg: (r && r.errMsg) || '加载失败',
    }
  }
  return {
    ok: true,
    providers: Array.isArray(r.providers) ? r.providers : [],
    requests: Array.isArray(r.requests) ? r.requests : [],
    searchMode: r.searchMode === 'city' ? 'city' : 'all',
    cityQuery: r.cityQuery || cityQuery,
    skip: typeof r.skip === 'number' ? r.skip : skip,
    limit: typeof r.limit === 'number' ? r.limit : limit,
    providerTotal: typeof r.providerTotal === 'number' ? r.providerTotal : 0,
    requestTotal: typeof r.requestTotal === 'number' ? r.requestTotal : 0,
    hasMoreProviders: !!r.hasMoreProviders,
    hasMoreRequests: !!r.hasMoreRequests,
  }
}

/** 分页拉取已发布列表，默认每页 50 条 */
export function loadPublishedFeed(options?: LoadFeedOptions): Promise<PublishedFeedResult> {
  const cityQuery = (options?.cityQuery || '').trim()
  const skip = Math.max(0, options?.skip ?? 0)
  const limit = Math.min(FEED_PAGE_SIZE, Math.max(1, options?.limit ?? FEED_PAGE_SIZE))
  const payload: Record<string, unknown> = { cityQuery, skip, limit }
  if (options?.listType === 'provider' || options?.listType === 'request') {
    payload.listType = options.listType
  }
  return callCloud('getPublishedFeed', payload).then((cloudRes) =>
    parseCloudResult(cloudRes, cityQuery, skip, limit)
  )
}

export function feedLocationHint(
  searchMode: FeedSearchMode,
  cityQuery: string,
  feedType: 'provider' | 'request',
  listCount: number,
  total: number,
  hasMore: boolean
): string {
  if (searchMode === 'city' && cityQuery) {
    if (total > 0) {
      return hasMore
        ? `筛选「${cityQuery}」· 已加载 ${listCount}/${total} 条`
        : `筛选「${cityQuery}」· 共 ${listCount} 条`
    }
    return `筛选「${cityQuery}」`
  }
  const label = feedType === 'provider' ? '寄养家庭' : '宠主需求'
  if (total > 0) {
    return hasMore
      ? `${label} · 已加载 ${listCount}/${total} 条`
      : `${label} · 共 ${listCount} 条`
  }
  return `${label} · 每页 ${FEED_PAGE_SIZE} 条`
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
