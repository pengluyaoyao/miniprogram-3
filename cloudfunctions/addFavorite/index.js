const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) {
    return { ok: false, errMsg: '未获取到 OPENID' }
  }
  const listingId = String(event.listingId || '').trim()
  const listingType = event.listingType === 'request' ? 'request' : 'provider'
  const titleCache = String(event.titleCache || '').trim().slice(0, 80)
  if (!listingId) {
    return { ok: false, errMsg: '缺少 listingId' }
  }

  const db = cloud.database()
  try {
    const coll = db.collection('favorites')
    const ex = await coll
      .where({
        user_openid: openid,
        listing_id: listingId,
        listing_type: listingType,
      })
      .limit(1)
      .get()
    if (ex.data && ex.data.length) {
      return { ok: true, duplicate: true }
    }
    await coll.add({
      data: {
        user_openid: openid,
        listing_id: listingId,
        listing_type: listingType,
        title_cache: titleCache || (listingType === 'provider' ? '寄养家庭' : '宠主需求'),
        created_at: db.serverDate(),
      },
    })
    return { ok: true, duplicate: false }
  } catch (err) {
    return { ok: false, errMsg: err.message || String(err) }
  }
}
