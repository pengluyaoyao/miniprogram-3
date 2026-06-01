import type { FeedCloudDoc } from './feedLoadTypes'
import { boardingPeriodTagFromDoc } from './boardingPeriod'
import { resolveCloudFileUrls } from './cloudImages'
import { locationLabelFromDoc } from './feedLoad'

export type FeedListType = 'provider' | 'request'

/** 列宽约 353rpx，封面高度 = 列宽 * coverPaddingPercent / 100 */
const COLUMN_WIDTH_RPX = 353
/** 列表卡片正文区（标题+市区+标签，不含描述） */
const BODY_BASE_RPX = 76

/** 列表封面高度上下限（相对列宽的 %，仅用于估算与映射） */
export const COVER_PAD_MIN = 100
export const COVER_PAD_MAX = 120

/** 错落封面比例（落在 MIN～MAX 内） */
const COVER_ASPECT_POOL = [100, 108, 115, 122, 128, 132, 112, 118, 125, 130]

export type WaterfallCard = {
  _id: string
  id: string
  name: string
  locationCity: string
  tags: string[]
  desc: string
  listType: FeedListType
  coverUrl: string
  hasCover: boolean
  placeholderType: FeedListType
  coverPaddingPercent: number
  /** 封面区固定高度（rpx），避免 padding-top 在真机上压住标题 */
  coverHeightRpx: number
  estHeight: number
}

function pickFirstImageUrl(raw: unknown): string {
  if (!Array.isArray(raw)) {
    return ''
  }
  const found = raw.find(
    (u): u is string =>
      typeof u === 'string' &&
      (/^https?:\/\//.test(u) || /^cloud:\/\//.test(u))
  )
  return found || ''
}

function clampPaddingPercent(pct: number): number {
  return Math.min(COVER_PAD_MAX, Math.max(COVER_PAD_MIN, Math.round(pct)))
}

/**
 * 按图片真实高/宽比映射列表封面高度（竖图压缩，避免盖住标题）
 * - ≤1.25 横/方：接近真实比例
 * - 1.25～1.6：线性压到 108%～132%
 * - ≥1.6 长竖图：顶到上限 COVER_PAD_MAX
 */
export function coverPaddingFromAspectRatio(aspectHeightOverWidth: number): number {
  const r = aspectHeightOverWidth
  if (!Number.isFinite(r) || r <= 0) {
    return COVER_PAD_MIN
  }
  if (r <= 1.25) {
    return clampPaddingPercent(r * 100)
  }
  if (r >= 1.6) {
    return COVER_PAD_MAX
  }
  const t = (r - 1.25) / (1.6 - 1.25)
  return clampPaddingPercent(105 + t * (COVER_PAD_MAX - 105))
}

export function coverHeightRpxFromPadding(coverPaddingPercent: number): number {
  return Math.round((COLUMN_WIDTH_RPX * coverPaddingPercent) / 100)
}

/** @deprecated 使用 coverPaddingFromAspectRatio */
export function clampCoverPaddingPercent(ratio: number): number {
  return coverPaddingFromAspectRatio(ratio)
}

export function stableCoverPaddingPercent(id: string): number {
  let h = 0
  const str = String(id || '')
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0
  }
  return clampPaddingPercent(
    COVER_ASPECT_POOL[Math.abs(h) % COVER_ASPECT_POOL.length]
  )
}

/** 列表预估高度（不含 desc，详情页再看全文） */
export function estimateCardHeight(
  name: string,
  tags: string[],
  coverPaddingPercent: number
): number {
  const coverH = Math.round((COLUMN_WIDTH_RPX * coverPaddingPercent) / 100)
  const titleLines = name.length > 15 ? 2 : 1
  const titleH = titleLines * 40
  const tagH = tags.length > 0 ? 40 : 0
  const cityH = 28
  return coverH + BODY_BASE_RPX + titleH + tagH + cityH
}

function mapDocToWaterfallCard(
  doc: FeedCloudDoc,
  listType: FeedListType,
  name: string,
  tags: string[],
  desc: string,
  photoField: 'environment_photos' | 'pet_photos'
): WaterfallCard {
  const id = doc._id as string
  const coverUrl = pickFirstImageUrl(doc[photoField])
  const maxTags = listType === 'request' ? 3 : 2
  const tagSlice = tags.slice(0, maxTags)
  const coverPaddingPercent = stableCoverPaddingPercent(id)
  return {
    _id: id,
    id,
    name,
    locationCity: locationLabelFromDoc(doc),
    tags: tagSlice,
    desc,
    listType,
    coverUrl,
    hasCover: !!coverUrl,
    placeholderType: listType,
    coverPaddingPercent,
    coverHeightRpx: coverHeightRpxFromPadding(coverPaddingPercent),
    estHeight: estimateCardHeight(name, tagSlice, coverPaddingPercent),
  }
}

export function mapProviderToWaterfall(doc: FeedCloudDoc): WaterfallCard {
  const tags = ((doc.service_tags as string[]) || []).slice(0, 4)
  const tagSlice = tags.length ? tags : ['家庭寄养']
  return mapDocToWaterfallCard(
    doc,
    'provider',
    (doc.display_name as string) || '寄养家庭',
    tagSlice,
    (doc.env_description as string) || (doc.service_summary as string) || '',
    'environment_photos'
  )
}

export function mapRequestToWaterfall(doc: FeedCloudDoc): WaterfallCard {
  const petName = (doc.pet_name as string) || '宠物'
  const petType = String(doc.pet_type || '').trim()
  const size = String(doc.size || '').trim()
  const periodTag = boardingPeriodTagFromDoc(doc)
  const tagSlice = [petType, size, periodTag].filter(Boolean)
  return mapDocToWaterfallCard(
    doc,
    'request',
    `${petName} 的寄养需求`,
    tagSlice.length ? tagSlice : ['寄养需求'],
    String(doc.description || doc.date_range_text || '').trim(),
    'pet_photos'
  )
}

export function recalcCardHeight(card: WaterfallCard): WaterfallCard {
  return {
    ...card,
    coverHeightRpx: coverHeightRpxFromPadding(card.coverPaddingPercent),
    estHeight: estimateCardHeight(card.name, card.tags, card.coverPaddingPercent),
  }
}

export function splitWaterfallColumns<T extends { estHeight: number }>(
  items: T[]
): { leftColumn: T[]; rightColumn: T[] } {
  const leftColumn: T[] = []
  const rightColumn: T[] = []
  let leftH = 0
  let rightH = 0
  items.forEach((item) => {
    if (leftH <= rightH) {
      leftColumn.push(item)
      leftH += item.estHeight
    } else {
      rightColumn.push(item)
      rightH += item.estHeight
    }
  })
  return { leftColumn, rightColumn }
}

export function resolveWaterfallCoverUrls(cards: WaterfallCard[]): Promise<WaterfallCard[]> {
  const urls = cards.map((c) => c.coverUrl).filter(Boolean)
  if (!urls.some((u) => /^cloud:\/\//.test(u))) {
    return Promise.resolve(cards)
  }
  return resolveCloudFileUrls(urls).then((resolved) => {
    let i = 0
    return cards.map((c) => {
      if (!c.coverUrl) {
        return c
      }
      const coverUrl = resolved[i]
      i += 1
      return { ...c, coverUrl }
    })
  })
}

export function buildWaterfallColumns(cards: WaterfallCard[]): {
  leftColumn: WaterfallCard[]
  rightColumn: WaterfallCard[]
} {
  return splitWaterfallColumns(cards)
}
