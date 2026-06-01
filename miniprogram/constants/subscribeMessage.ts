/** 新留言订阅消息模板（公众平台 → 订阅消息，一次性订阅） */
export const SUBSCRIBE_TMPL_NEW_MSG = '9JxH1WSbK_o3VkWScncrkAQIYFxYFGijFnet30TaIR8'

/** 调起授权用，最多 3 个 */
export const SUBSCRIBE_MESSAGE_TEMPLATE_IDS: string[] = [SUBSCRIBE_TMPL_NEW_MSG]

const SUBSCRIBE_PROMPTED_KEY = 'subscribe_new_msg_prompted_v1'

function tmplIdsToRequest(): string[] {
  return SUBSCRIBE_MESSAGE_TEMPLATE_IDS.filter(Boolean).slice(0, 3)
}

function subscriptionStatus(
  settings: WechatMiniprogram.SubscriptionsSetting | undefined,
  tmplId: string
): string {
  if (!settings || !settings.itemSettings) {
    return ''
  }
  return String(settings.itemSettings[tmplId] || '')
}

/**
 * 一次性订阅：仅在用户从未被询问过、且未在设置里选过接受/拒绝时弹窗一次。
 * 避免每次点「提交发布」「发站内留言」都弹出订阅授权。
 */
export function requestNewMessageSubscribe(): Promise<void> {
  const tmplIds = tmplIdsToRequest()
  if (!tmplIds.length) {
    return Promise.resolve()
  }

  if (wx.getStorageSync(SUBSCRIBE_PROMPTED_KEY)) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    wx.getSetting({
      withSubscriptions: true,
      success: (res) => {
        const sub = res.subscriptionsSetting
        if (sub && sub.mainSwitch === false) {
          wx.setStorageSync(SUBSCRIBE_PROMPTED_KEY, true)
          resolve()
          return
        }

        const pending = tmplIds.filter((id) => {
          const st = subscriptionStatus(sub, id)
          return st !== 'accept' && st !== 'reject' && st !== 'ban'
        })

        if (!pending.length) {
          wx.setStorageSync(SUBSCRIBE_PROMPTED_KEY, true)
          resolve()
          return
        }

        wx.requestSubscribeMessage({
          tmplIds: pending,
          complete: () => {
            wx.setStorageSync(SUBSCRIBE_PROMPTED_KEY, true)
            resolve()
          },
          fail: () => {
            wx.setStorageSync(SUBSCRIBE_PROMPTED_KEY, true)
            resolve()
          },
        })
      },
      fail: () => resolve(),
    })
  })
}
