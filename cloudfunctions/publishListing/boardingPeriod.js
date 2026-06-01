/** 与 miniprogram/utils/boardingPeriod.ts 逻辑一致 */
function formatYmdShort(ymd) {
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

function formatBoardingRangeLabel(startYmd, endYmd) {
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

module.exports = { formatBoardingRangeLabel }
