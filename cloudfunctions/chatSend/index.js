const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/** 与 miniprogram/constants/subscribeMessage.ts 保持一致 */
const DEFAULT_SUBSCRIBE_TMPL_NEW_MSG = '9JxH1WSbK_o3VkWScncrkAQIYFxYFGijFnet30TaIR8'

const db = cloud.database()
const _ = db.command

function sortPair(a, b) {
  return a < b ? [a, b] : [b, a]
}

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

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const sender = wxContext.OPENID
  if (!sender) {
    return { ok: false, errMsg: '未获取到 OPENID' }
  }

  const body = String(event.body || '').trim()
  const listingTitle = String(event.listingTitle || '').trim().slice(0, 60)
  const threadIdInput = String(event.threadId || '').trim()
  let listingId = String(event.listingId || '').trim()
  let listingType = event.listingType === 'request' ? 'request' : 'provider'

  if (!body) {
    return { ok: false, errMsg: '留言不能为空' }
  }
  if (body.length > 800) {
    return { ok: false, errMsg: '留言过长' }
  }

  let threadId = ''
  let recipient = ''
  let lo = ''
  let hi = ''

  if (threadIdInput) {
    const tr = await db.collection('chat_threads').doc(threadIdInput).get()
    const t = tr.data
    if (!t) {
      return { ok: false, errMsg: '会话不存在' }
    }
    if (t.openid_lo !== sender && t.openid_hi !== sender) {
      return { ok: false, errMsg: '无权在此会话发信' }
    }
    threadId = threadIdInput
    listingId = String(t.listing_id || '')
    listingType = t.listing_type === 'request' ? 'request' : 'provider'
    lo = t.openid_lo
    hi = t.openid_hi
    recipient = lo === sender ? hi : lo
  } else {
    if (!listingId) {
      return { ok: false, errMsg: '缺少 listingId' }
    }
    recipient = await recipientFromListing(listingId, listingType)
    if (!recipient) {
      return { ok: false, errMsg: '对方信息不可用或已下线' }
    }
    if (recipient === sender) {
      return { ok: false, errMsg: '不能给自己发站内信' }
    }
    ;[lo, hi] = sortPair(sender, recipient)

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

    if (exist.data && exist.data.length) {
      threadId = exist.data[0]._id
    } else {
      const addT = await db.collection('chat_threads').add({
        data: {
          listing_id: listingId,
          listing_type: listingType,
          openid_lo: lo,
          openid_hi: hi,
          listing_title_cache:
            listingTitle || (listingType === 'provider' ? '寄养家庭' : '宠主需求'),
          unread_lo: 0,
          unread_hi: 0,
          last_message_body: '',
          last_message_at: db.serverDate(),
          created_at: db.serverDate(),
        },
      })
      threadId = addT._id
    }
  }

  const now = db.serverDate()
  await db.collection('chat_messages').add({
    data: {
      thread_id: threadId,
      listing_id: listingId,
      listing_type: listingType,
      from_openid: sender,
      to_openid: recipient,
      body,
      created_at: now,
    },
  })

  const incField = recipient === lo ? 'unread_lo' : 'unread_hi'
  await db
    .collection('chat_threads')
    .doc(threadId)
    .update({
      data: {
        last_message_body: body.slice(0, 80),
        last_message_at: now,
        [incField]: _.inc(1),
      },
    })

  const tmplId = process.env.SUBSCRIBE_TMPL_NEW_MSG || DEFAULT_SUBSCRIBE_TMPL_NEW_MSG
  const miniprogramState = process.env.SUBSCRIBE_MINIPROGRAM_STATE || 'formal'
  if (tmplId && recipient) {
    try {
      const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ')
      const preview = (listingTitle || body).slice(0, 20) || '新留言'
      await cloud.openapi.subscribeMessage.send({
        touser: recipient,
        templateId: tmplId,
        page: 'pages/inbox/inbox',
        lang: 'zh_CN',
        data: {
          thing1: { value: '新站内留言' },
          thing4: { value: preview },
          time3: { value: nowStr },
          thing6: { value: ' ' },
        },
        miniprogramState,
      })
    } catch (e) {
      console.warn('[chatSend] subscribeMessage', e && (e.message || e))
    }
  }

  return { ok: true, threadId }
}
