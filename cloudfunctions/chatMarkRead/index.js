const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const me = wxContext.OPENID
  if (!me) {
    return { ok: false, errMsg: '未获取到 OPENID' }
  }

  const threadId = String(event.threadId || '').trim()
  if (!threadId) {
    return { ok: false, errMsg: '缺少 threadId' }
  }

  const tr = await db.collection('chat_threads').doc(threadId).get()
  const t = tr.data
  if (!t) {
    return { ok: false, errMsg: '会话不存在' }
  }
  if (t.openid_lo !== me && t.openid_hi !== me) {
    return { ok: false, errMsg: '无权操作' }
  }

  const field = t.openid_lo === me ? 'unread_lo' : 'unread_hi'
  await db.collection('chat_threads').doc(threadId).update({
    data: {
      [field]: 0,
    },
  })

  return { ok: true }
}
