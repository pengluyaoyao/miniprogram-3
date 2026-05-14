const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

function ts(v) {
  if (!v) return 0
  if (v instanceof Date) return v.getTime()
  if (typeof v === 'number') return v
  if (typeof v === 'object' && v.$date) return new Date(v.$date).getTime()
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? 0 : d.getTime()
}

exports.main = async () => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) {
    return { ok: false, errMsg: '未获取到 OPENID', items: [] }
  }
  const db = cloud.database()
  try {
    const res = await db.collection('boarding_requests').where({ owner_openid: openid }).limit(50).get()
    const items = (res.data || []).sort((a, b) => ts(b.created_at) - ts(a.created_at))
    return { ok: true, items }
  } catch (err) {
    return { ok: false, errMsg: err.message || String(err), items: [] }
  }
}
