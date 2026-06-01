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

function formatBoardingRangeLabel(startYmd, endYmd) {
  const fmt = (ymd) => {
    const p = String(ymd || '').trim().split('-')
    if (p.length < 3) return ''
    const m = parseInt(p[1], 10)
    const day = parseInt(p[2], 10)
    if (!Number.isFinite(m) || !Number.isFinite(day)) return ''
    return `${m}月${day}日`
  }
  const a = fmt(startYmd)
  const b = fmt(endYmd)
  if (a && b && startYmd !== endYmd) return `${a}-${b}`
  return a || b || String(startYmd || '')
}

function statusLabel(status) {
  if (status === 'published') return '展示中'
  if (status === 'hidden') return '已下架'
  return status || '未知'
}

exports.main = async () => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) {
    return { ok: false, errMsg: '未获取到 OPENID', items: [] }
  }
  const db = cloud.database()
  try {
    const [reqRes, provRes] = await Promise.all([
      db.collection('boarding_requests').where({ owner_openid: openid }).limit(50).get(),
      db.collection('provider_profiles').where({ user_openid: openid }).limit(50).get(),
    ])
    const requests = (reqRes.data || []).map((doc) => {
      const pet = String(doc.pet_name || '宠物')
      const period =
        formatBoardingRangeLabel(doc.start_date, doc.end_date) ||
        String(doc.date_range_text || '').trim()
      const city = String(doc.location_city || '').trim()
      const desc = String(doc.description || '').trim().slice(0, 40)
      return {
        _id: doc._id,
        listType: 'request',
        title: `${pet} 的寄养需求`,
        sub: [period, city, desc].filter(Boolean).join(' · ') || '宠主需求',
        status: doc.status || 'published',
        statusLabel: statusLabel(doc.status),
        created_at: doc.created_at,
      }
    })
    const providers = (provRes.data || []).map((doc) => {
      const name = String(doc.display_name || '寄养家庭')
      const city = String(doc.location_city || '').trim()
      const summary = String(doc.service_summary || '').trim().slice(0, 40)
      return {
        _id: doc._id,
        listType: 'provider',
        title: name,
        sub: [city, summary].filter(Boolean).join(' · ') || '寄养家庭',
        status: doc.status || 'published',
        statusLabel: statusLabel(doc.status),
        created_at: doc.created_at,
      }
    })
    const items = [...requests, ...providers].sort((a, b) => ts(b.created_at) - ts(a.created_at))
    return { ok: true, items }
  } catch (err) {
    return { ok: false, errMsg: err.message || String(err), items: [] }
  }
}
