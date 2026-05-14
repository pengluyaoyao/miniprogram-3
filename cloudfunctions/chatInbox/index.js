const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

function ts(v) {
  if (!v) {
    return 0
  }
  if (v instanceof Date) {
    return v.getTime()
  }
  if (typeof v === 'number') {
    return v
  }
  if (typeof v === 'object' && v.$date) {
    return new Date(v.$date).getTime()
  }
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? 0 : d.getTime()
}

exports.main = async () => {
  const wxContext = cloud.getWXContext()
  const me = wxContext.OPENID
  if (!me) {
    return { ok: false, errMsg: '未获取到 OPENID', threads: [], unreadTotal: 0 }
  }

  const [a, b] = await Promise.all([
    db.collection('chat_threads').where({ openid_lo: me }).limit(50).get(),
    db.collection('chat_threads').where({ openid_hi: me }).limit(50).get(),
  ])

  const map = new Map()
  ;[...(a.data || []), ...(b.data || [])].forEach((t) => {
    map.set(t._id, t)
  })
  const rows = Array.from(map.values()).sort((x, y) => ts(y.last_message_at) - ts(x.last_message_at))

  let unreadTotal = 0
  const threads = rows.map((t) => {
    const unread = t.openid_lo === me ? t.unread_lo || 0 : t.unread_hi || 0
    unreadTotal += unread
    const other = t.openid_lo === me ? t.openid_hi : t.openid_lo
    return {
      _id: t._id,
      listing_id: t.listing_id || '',
      listing_title_cache: t.listing_title_cache || '会话',
      listing_type: t.listing_type,
      last_message_body: t.last_message_body || '',
      last_message_at: t.last_message_at,
      unread,
      other_openid_tail: other ? String(other).slice(-6) : '',
    }
  })

  return { ok: true, threads, unreadTotal }
}
