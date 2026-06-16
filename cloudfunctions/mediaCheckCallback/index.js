/**
 * 接收微信「多媒体内容安全识别」异步结果推送（需在公众平台配置消息推送到本云函数）
 * 事件类型含 wxa_media_check
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

function parseResultObject(event) {
  let result = event.result
  if (typeof result === 'string') {
    try {
      result = JSON.parse(result)
    } catch (_e) {
      result = null
    }
  }
  return result && typeof result === 'object' ? result : null
}

function parseTraceId(event) {
  return String(event.trace_id || event.Trace_id || event.traceId || '').trim()
}

function parseSuggest(event) {
  const result = parseResultObject(event)
  if (result && result.suggest) {
    return String(result.suggest).trim()
  }
  if (event.suggest) {
    return String(event.suggest).trim()
  }
  return ''
}

exports.main = async (event) => {
  const traceId = parseTraceId(event)
  const suggest = parseSuggest(event)

  if (!traceId) {
    return { ok: false, errMsg: 'missing trace_id' }
  }

  const db = cloud.database()
  try {
    const found = await db
      .collection('sec_media_checks')
      .where({ trace_id: traceId })
      .limit(1)
      .get()
    if (!found.data || !found.data.length) {
      await db.collection('sec_media_checks').add({
        data: {
          trace_id: traceId,
          file_id: '',
          openid: '',
          suggest,
          done: true,
          created_at: db.serverDate(),
        },
      })
      return { ok: true, created: true }
    }
    await db
      .collection('sec_media_checks')
      .doc(found.data[0]._id)
      .update({
        data: {
          suggest,
          done: true,
        },
      })
    return { ok: true }
  } catch (err) {
    console.warn('[mediaCheckCallback]', err.message || err)
    return { ok: false, errMsg: err.message || String(err) }
  }
}
