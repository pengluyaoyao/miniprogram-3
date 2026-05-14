const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async () => {
  const db = cloud.database()
  const MAX = 50
  try {
    const [provRes, reqRes] = await Promise.all([
      db.collection('provider_profiles').where({ status: 'published' }).limit(MAX).get(),
      db.collection('boarding_requests').where({ status: 'published' }).limit(MAX).get(),
    ])
    return {
      ok: true,
      providers: provRes.data || [],
      requests: reqRes.data || [],
    }
  } catch (err) {
    return {
      ok: false,
      errMsg: err.message || String(err),
      providers: [],
      requests: [],
    }
  }
}
