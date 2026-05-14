import { callCloud } from '../../utils/cloud'
import { getLocalUserBrief } from '../../utils/auth'
import { refreshAllMessageBadges } from '../../utils/inboxBadge'

type ChatMsg = {
  _id: string
  from_openid: string
  to_openid: string
  body: string
  created_at?: unknown
}

function formatMsgTime(t: unknown): string {
  try {
    let d: Date
    if (t instanceof Date) {
      d = t
    } else {
      d = new Date(t as string | number)
    }
    if (Number.isNaN(d.getTime())) {
      return ''
    }
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return ''
  }
}

Page({
  data: {
    myOpenid: '',
    threadId: '',
    listingId: '',
    listingType: 'provider' as 'provider' | 'request',
    listingTitle: '',
    messages: [] as (ChatMsg & { timeLabel: string; mine: boolean })[],
    inputValue: '',
    sending: false,
    loadError: '',
    selfOwner: false,
    scrollInto: '',
  },

  onLoad(query: Record<string, string | undefined>) {
    const brief = getLocalUserBrief()
    const threadId = (query.threadId && decodeURIComponent(query.threadId)) || ''
    const listingId = (query.id && decodeURIComponent(query.id)) || ''
    const listingType = (query.type && decodeURIComponent(query.type)) === 'request' ? 'request' : 'provider'
    const listingTitle = (query.title && decodeURIComponent(query.title)) || ''
    this.setData({
      myOpenid: brief.openid,
      threadId,
      listingId,
      listingType,
      listingTitle,
    })
    ;(this as unknown as { _contactSkipFirstShow?: boolean })._contactSkipFirstShow = true
    this.loadThread()
  },

  onShow() {
    const self = this as unknown as { _contactSkipFirstShow?: boolean }
    if (self._contactSkipFirstShow) {
      self._contactSkipFirstShow = false
      return
    }
    if (this.data.selfOwner) {
      return
    }
    if (this.data.threadId || this.data.listingId) {
      this.loadThread()
    }
  },

  loadThread() {
    const { threadId, listingId, listingType } = this.data
    const payload: Record<string, string> = {}
    if (threadId) {
      payload.threadId = threadId
    } else {
      payload.listingId = listingId
      payload.listingType = listingType
    }
    callCloud('chatLoad', payload)
      .then((res) => {
        const brief = getLocalUserBrief()
        const r = res.result as {
          ok?: boolean
          errMsg?: string
          threadId?: string | null
          messages?: ChatMsg[]
          selfOwner?: boolean
        }
        if (!r || !r.ok) {
          this.setData({ loadError: (r && r.errMsg) || '加载失败' })
          return
        }
        if (r.selfOwner) {
          this.setData({ selfOwner: true, loadError: '这是您自己的发布，无法给自己留言' })
          return
        }
        const tid = (r.threadId as string) || ''
        const list = (r.messages || []).map((m) => ({
          ...m,
          timeLabel: formatMsgTime(m.created_at),
          mine: m.from_openid === brief.openid,
        }))
        this.setData({
          threadId: tid,
          messages: list,
          loadError: '',
          scrollInto: list.length ? `msg-${list[list.length - 1]._id}` : '',
        })
        if (tid) {
          callCloud('chatMarkRead', { threadId: tid })
            .then(() => refreshAllMessageBadges())
            .catch(() => {})
        } else {
          refreshAllMessageBadges().catch(() => {})
        }
      })
      .catch(() => {
        this.setData({ loadError: '网络异常' })
      })
  },

  onInput(e: WechatMiniprogram.Input) {
    this.setData({ inputValue: e.detail.value })
  },

  stripLocalMessages() {
    const messages = this.data.messages.filter((m) => !String(m._id).startsWith('local_'))
    this.setData({ messages })
  },

  send() {
    const body = this.data.inputValue.trim()
    if (!body || this.data.sending || this.data.selfOwner) {
      return
    }
    const brief = getLocalUserBrief()
    const tempId = `local_${Date.now()}`
    const optimistic: ChatMsg & { timeLabel: string; mine: boolean } = {
      _id: tempId,
      from_openid: brief.openid,
      to_openid: '',
      body,
      timeLabel: formatMsgTime(Date.now()),
      mine: true,
    }
    this.setData({
      messages: [...this.data.messages, optimistic],
      inputValue: '',
      scrollInto: `msg-${tempId}`,
      sending: true,
    })

    const { threadId, listingId, listingType, listingTitle } = this.data
    const payload: Record<string, unknown> = { body, listingTitle }
    if (threadId) {
      payload.threadId = threadId
    } else {
      payload.listingId = listingId
      payload.listingType = listingType
      payload.listingTitle = listingTitle
    }
    callCloud('chatSend', payload)
      .then((res) => {
        const r = res.result as { ok?: boolean; errMsg?: string; threadId?: string }
        if (!r || !r.ok) {
          this.stripLocalMessages()
          wx.showToast({ title: r?.errMsg || '发送失败', icon: 'none' })
          return
        }
        if (r.threadId) {
          this.setData({ threadId: r.threadId as string })
        }
        wx.showToast({ title: '已发送', icon: 'success' })
        setTimeout(() => {
          this.loadThread()
          refreshAllMessageBadges().catch(() => {})
        }, 200)
      })
      .catch((err: { errMsg?: string }) => {
        this.stripLocalMessages()
        wx.showToast({ title: err.errMsg || '发送失败', icon: 'none' })
      })
      .finally(() => {
        this.setData({ sending: false })
      })
  },
})
