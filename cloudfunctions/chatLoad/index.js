const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

async function recipientFromListing(listingId, listingType) {
  const coll = listingType === 'request' ? 'boarding_requests' : 'provider_profiles'
  const res = await db.collection(coll).doc(listingId).get()
  const d = res.data
  if (!d || d.status !== 'published') {
    return null
  }
  if (listingType === 'provider') {
    return d.user_openid || null
  }
  return d.owner_openid || null
}

function sortPair(a, b) {
  return a < b ? [a, b] : [b, a]
}

async function loadMessages(threadId) {
  const res = await db.collection('chat_messages').where({ thread_id: threadId }).limit(100).get()
  const arr = res.data || []
  return arr.sort((a, b) => {
    const ta =
      a.created_at && a.created_at.getTime
        ? a.created_at.getTime()
        : new Date(a.created_at || 0).getTime()
    const tb =
      b.created_at && b.created_at.getTime
        ? b.created_at.getTime()
        : new Date(b.created_at || 0).getTime()
    return ta - tb
  })
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const me = wxContext.OPENID
  if (!me) {
    return { ok: false, errMsg: '未获取到 OPENID' }
  }

  const threadId = String(event.threadId || '').trim()
  const listingId = String(event.listingId || '').trim()
  const listingType = event.listingType === 'request' ? 'request' : 'provider'

  if (threadId) {
    const tr = await db.collection('chat_threads').doc(threadId).get()
    const t = tr.data
    if (!t) {
      return { ok: false, errMsg: '会话不存在' }
    }
    if (t.openid_lo !== me && t.openid_hi !== me) {
      return { ok: false, errMsg: '无权查看' }
    }
    const messages = await loadMessages(threadId)
    return {
      ok: true,
      threadId,
      thread: t,
      messages,
    }
  }

  if (!listingId) {
    return { ok: false, errMsg: '缺少参数' }
  }

  const recipient = await recipientFromListing(listingId, listingType)
  if (!recipient) {
    return { ok: false, errMsg: '信息不可用' }
  }
  if (recipient === me) {
    return { ok: true, threadId: null, thread: null, messages: [], selfOwner: true }
  }

  const [lo, hi] = sortPair(me, recipient)
  const exist = await db
    .collection('chat_threads')
    .where({
      listing_id: listingId,
      listing_type: listingType,
      openid_lo: lo,
      openid_hi: hi,
    })
    .limit(1)
    .get()

  if (!exist.data || !exist.data.length) {
    return {
      ok: true,
      threadId: null,
      thread: null,
      messages: [],
      recipientOpenid: recipient,
    }
  }

  const t = exist.data[0]
  const tid = t._id
  const messages = await loadMessages(tid)
  return {
    ok: true,
    threadId: tid,
    thread: t,
    messages,
    recipientOpenid: recipient,
  }
}
