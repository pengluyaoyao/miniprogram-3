import { isLoggedIn } from './auth'
import { callCloud } from './cloud'

type PageWithSetData = { setData: (data: Record<string, unknown>) => void }

function pagesNeedingBadge(): PageWithSetData[] {
  return getCurrentPages() as unknown as PageWithSetData[]
}

/** 同步更新页面栈里各页的 msgUnread（底部「我的」角标） */
export function refreshAllMessageBadges(): Promise<number> {
  if (!isLoggedIn()) {
    pagesNeedingBadge().forEach((p) => {
      if (p && typeof p.setData === 'function') {
        p.setData({ msgUnread: 0 })
      }
    })
    return Promise.resolve(0)
  }
  return callCloud('chatInbox')
    .then((res) => {
      const r = res.result as { ok?: boolean; unreadTotal?: number }
      const raw = r && r.ok && typeof r.unreadTotal === 'number' ? r.unreadTotal : 0
      const n = Math.min(99, raw)
      pagesNeedingBadge().forEach((p) => {
        if (p && typeof p.setData === 'function') {
          p.setData({ msgUnread: n })
        }
      })
      return n
    })
    .catch(() => {
      pagesNeedingBadge().forEach((p) => {
        if (p && typeof p.setData === 'function') {
          p.setData({ msgUnread: 0 })
        }
      })
      return 0
    })
}

/** @deprecated 传参已无意义，保留签名以少改调用处 */
export function refreshMessageBadge(_page?: PageWithSetData): Promise<number> {
  return refreshAllMessageBadges()
}
