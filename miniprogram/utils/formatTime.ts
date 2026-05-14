/** 云数据库日期 / ISO 字符串 → 可读时间 */
export function formatCloudTime(t: unknown): string {
  try {
    let d: Date
    if (t instanceof Date) {
      d = t
    } else if (t && typeof t === 'object' && '$date' in (t as object)) {
      d = new Date((t as { $date: string }).$date)
    } else {
      d = new Date(t as string | number)
    }
    if (Number.isNaN(d.getTime())) {
      return ''
    }
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}
