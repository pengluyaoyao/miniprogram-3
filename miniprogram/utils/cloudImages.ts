import { CLOUD_ENV_ID } from '../constants/cloudEnv'

/** 将 cloud:// fileID 转为可展示的 HTTPS 临时链接 */
export function resolveCloudFileUrls(urls: string[]): Promise<string[]> {
  const list = urls.map((u) => String(u || '').trim()).filter(Boolean)
  const cloudIds = [...new Set(list.filter((u) => /^cloud:\/\//.test(u)))]
  if (!cloudIds.length || !wx.cloud) {
    return Promise.resolve(list)
  }
  return new Promise((resolve) => {
    wx.cloud.getTempFileURL({
      fileList: cloudIds,
      config: { env: CLOUD_ENV_ID },
      success: (res) => {
        const map = new Map<string, string>()
        ;(res.fileList || []).forEach((f) => {
          if (f.fileID && f.status === 0 && f.tempFileURL) {
            map.set(f.fileID, f.tempFileURL)
          }
        })
        resolve(list.map((u) => map.get(u) || u))
      },
      fail: () => resolve(list),
    })
  })
}

export async function resolvePhotoCells<T extends { url?: string }>(
  cells: T[]
): Promise<T[]> {
  const urls = cells.map((c) => c.url).filter((u): u is string => !!u)
  if (!urls.length) {
    return cells
  }
  const resolved = await resolveCloudFileUrls(urls)
  let i = 0
  return cells.map((c) => {
    if (!c.url) {
      return c
    }
    const next = { ...c, url: resolved[i] }
    i += 1
    return next
  })
}
