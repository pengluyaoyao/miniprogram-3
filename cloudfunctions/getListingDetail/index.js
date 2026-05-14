const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const listingType = event.listingType === 'request' ? 'request' : 'provider'
  const id = String(event.id || '').trim()
  if (!id) {
    return { ok: false, errMsg: '缺少 id' }
  }

  const db = cloud.database()
  const coll = listingType === 'provider' ? 'provider_profiles' : 'boarding_requests'

  try {
    const res = await db.collection(coll).doc(id).get()
    const doc = res.data
    if (!doc || doc.status !== 'published') {
      return { ok: false, errMsg: '未找到或已下线' }
    }
    return { ok: true, listingType, doc }
  } catch (err) {
    return { ok: false, errMsg: err.message || String(err) }
  }
}
