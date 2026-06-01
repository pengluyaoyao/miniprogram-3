const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) {
    return { ok: false, errMsg: '未获取到 OPENID' }
  }
  const listingId = String(event.listingId || '').trim()
  const listType = event.listingType === 'provider' ? 'provider' : 'request'
  if (!listingId) {
    return { ok: false, errMsg: '缺少 listingId' }
  }
  const coll = listType === 'provider' ? 'provider_profiles' : 'boarding_requests'
  const ownerField = listType === 'provider' ? 'user_openid' : 'owner_openid'
  const db = cloud.database()
  try {
    const res = await db.collection(coll).doc(listingId).get()
    const doc = res.data
    if (!doc) {
      return { ok: false, errMsg: '记录不存在' }
    }
    if (doc[ownerField] !== openid) {
      return { ok: false, errMsg: '无权编辑该发布' }
    }
    if (doc.status === 'hidden') {
      return { ok: false, errMsg: '已删除的记录无法编辑' }
    }
    return { ok: true, listType, doc }
  } catch (err) {
    return { ok: false, errMsg: err.message || String(err) }
  }
}
