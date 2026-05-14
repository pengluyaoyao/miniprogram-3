const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const REASONS = new Set(['虚假信息', '联系方式无效', '骚扰或不当内容', '其他'])

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) {
    return { ok: false, errMsg: '未获取到 OPENID' }
  }
  const listingId = String(event.listingId || '').trim()
  const listingType = event.listingType === 'request' ? 'request' : 'provider'
  const listingTitle = String(event.listingTitle || '').trim().slice(0, 120)
  let reason = String(event.reason || '其他').trim().slice(0, 40)
  if (!REASONS.has(reason)) {
    reason = '其他'
  }
  const detail = String(event.detail || '').trim().slice(0, 500)
  if (!listingId) {
    return { ok: false, errMsg: '缺少 listingId' }
  }
  if (!detail) {
    return { ok: false, errMsg: '请填写举报说明' }
  }

  const db = cloud.database()
  try {
    await db.collection('reports').add({
      data: {
        reporter_openid: openid,
        listing_id: listingId,
        listing_type: listingType,
        listing_title: listingTitle || (listingType === 'provider' ? '寄养家庭' : '宠主需求'),
        reason,
        detail,
        status: 'submitted',
        created_at: db.serverDate(),
      },
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, errMsg: err.message || String(err) }
  }
}
