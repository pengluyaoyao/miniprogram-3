import type { FeedCloudDoc } from './feedLoadTypes'

/** YYYY-MM-DD */
export function todayYmd(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDaysYmd(ymd: string, days: number): string {
  const parts = String(ymd || '').split('-').map(Number)
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) {
    return todayYmd()
  }
  const d = new Date(parts[0], parts[1] - 1, parts[2])
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatYmdShort(ymd: string): string {
  const parts = String(ymd || '').trim().split('-')
  if (parts.length < 3) {
    return ''
  }
  const m = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)
  if (!Number.isFinite(m) || !Number.isFinite(day)) {
    return ''
  }
  return `${m}月${day}日`
}

/** 展示用：6月1日-6月5日 */
export function formatBoardingRangeLabel(startYmd: string, endYmd: string): string {
  const start = String(startYmd || '').trim().slice(0, 10)
  const end = String(endYmd || '').trim().slice(0, 10)
  if (!start && !end) {
    return ''
  }
  if (start && end) {
    if (start === end) {
      return formatYmdShort(start)
    }
    const a = formatYmdShort(start)
    const b = formatYmdShort(end)
    if (a && b) {
      return `${a}-${b}`
    }
  }
  return formatYmdShort(start) || formatYmdShort(end) || ''
}

/** 首页标签：短一点，最多 12 字 */
export function boardingPeriodTagFromDoc(doc: FeedCloudDoc): string {
  const start = String(doc.start_date || '').trim().slice(0, 10)
  const end = String(doc.end_date || '').trim().slice(0, 10)
  const fromDates = formatBoardingRangeLabel(start, end)
  if (fromDates) {
    return fromDates.slice(0, 12)
  }
  const legacy = String(doc.date_range_text || '').trim()
  return legacy.slice(0, 12)
}
