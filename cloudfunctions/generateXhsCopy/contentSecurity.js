/**
 * 发布内容安全：文本 msgSecCheck（同步）、图片 mediaCheckAsync（异步，依赖消息推送到 mediaCheckCallback）
 */
const SEC_VIOLATION_MSG = '内容含有违规信息，请修改后重试'
const IMG_TOO_LARGE_MSG = '图片过大，请换一张较小的照片重试'

const TEXT_SCENE = 3
const MEDIA_SCENE = 3
const IMG_SEC_MAX_BYTES = 1024 * 1024

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function textSuggestPass(res) {
  const suggest =
    res?.result?.result?.suggest ||
    res?.result?.suggest ||
    (res?.errCode === 0 && res?.errMsg === 'openapi.security.msgSecCheck:ok' ? 'pass' : '')
  if (suggest === 'risky') {
    return false
  }
  if (suggest === 'pass' || suggest === 'review') {
    return true
  }
  if (res?.errCode === 87014) {
    return false
  }
  return res?.errCode === 0
}

async function checkOneText(cloud, openid, content) {
  const text = String(content || '').trim()
  if (!text) {
    return { ok: true }
  }
  try {
    const res = await cloud.openapi.security.msgSecCheck({
      version: 2,
      openid,
      scene: TEXT_SCENE,
      content: text.slice(0, 2500),
    })
    if (textSuggestPass(res)) {
      return { ok: true }
    }
    return { ok: false, errMsg: SEC_VIOLATION_MSG }
  } catch (e) {
    const code = e.errCode || e.errcode
    if (code === 87014) {
      return { ok: false, errMsg: SEC_VIOLATION_MSG }
    }
    console.warn('[contentSecurity] msgSecCheck', e.message || e)
    return { ok: false, errMsg: SEC_VIOLATION_MSG }
  }
}

/** 合并多段文本做一次检测（减少调用次数） */
async function checkPublishTexts(cloud, openid, parts) {
  const merged = parts
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .join('\n')
  if (!merged) {
    return { ok: true }
  }
  return checkOneText(cloud, openid, merged)
}

function mediaSuggestPass(suggest) {
  return suggest === 'pass' || suggest === 'review'
}

/** 同步图片检测（异步超时或未配置推送时的兜底；要求 ≤1MB JPEG） */
async function checkImageSync(cloud, fileID) {
  try {
    const dl = await cloud.downloadFile({ fileID })
    const buf = dl.fileContent
    if (!buf || !buf.length) {
      return { ok: false, errMsg: SEC_VIOLATION_MSG }
    }
    if (buf.length > IMG_SEC_MAX_BYTES) {
      console.warn('[contentSecurity] imgSecCheck skip, too large', fileID, buf.length)
      return { ok: false, errMsg: IMG_TOO_LARGE_MSG }
    }
    const res = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: 'image/jpeg',
        value: buf,
      },
    })
    if (res && res.errCode === 0) {
      return { ok: true }
    }
    return { ok: false, errMsg: SEC_VIOLATION_MSG }
  } catch (e) {
    const code = e.errCode || e.errcode
    if (code === 87014 || code === 87015) {
      return { ok: false, errMsg: SEC_VIOLATION_MSG }
    }
    console.warn('[contentSecurity] imgSecCheck', fileID, e.message || e)
    return { ok: false, errMsg: SEC_VIOLATION_MSG }
  }
}

async function resolveCloudHttpsUrl(cloud, fileID) {
  const res = await cloud.getTempFileURL({ fileList: [fileID] })
  const item = (res.fileList || [])[0]
  if (item && item.status === 0 && item.tempFileURL) {
    return item.tempFileURL
  }
  return ''
}

async function submitMediaCheckAsync(cloud, db, openid, fileID) {
  const mediaUrl = await resolveCloudHttpsUrl(cloud, fileID)
  if (!mediaUrl) {
    return { ok: false, errMsg: SEC_VIOLATION_MSG }
  }
  let traceId = ''
  try {
    const res = await cloud.openapi.security.mediaCheckAsync({
      version: 2,
      openid,
      scene: MEDIA_SCENE,
      media_url: mediaUrl,
      media_type: 2,
    })
    traceId = res?.trace_id || res?.result?.trace_id || ''
    if (!traceId) {
      return { ok: false, errMsg: SEC_VIOLATION_MSG, useSyncFallback: true }
    }
  } catch (e) {
    console.warn('[contentSecurity] mediaCheckAsync submit', e.message || e)
    return { ok: false, errMsg: SEC_VIOLATION_MSG, useSyncFallback: true }
  }

  try {
    await db.collection('sec_media_checks').add({
      data: {
        trace_id: traceId,
        file_id: fileID,
        openid,
        suggest: '',
        done: false,
        created_at: db.serverDate(),
      },
    })
  } catch (e) {
    console.warn('[contentSecurity] sec_media_checks add', e.message || e)
  }

  return { ok: true, traceId, fileID }
}

async function waitTraceResults(db, traceIds, timeoutMs) {
  const _ = db.command
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const res = await db
      .collection('sec_media_checks')
      .where({ trace_id: _.in(traceIds) })
      .get()
    const rows = res.data || []
    if (rows.length >= traceIds.length && rows.every((r) => r.done)) {
      return rows
    }
    await sleep(800)
  }
  return null
}

async function deleteCloudFiles(cloud, fileIDs) {
  const ids = [...new Set(fileIDs.filter((id) => /^cloud:\/\//.test(id)))]
  if (!ids.length) {
    return
  }
  try {
    await cloud.deleteFile({ fileList: ids })
  } catch (e) {
    console.warn('[contentSecurity] deleteFile', e.message || e)
  }
}

/**
 * 检测图片列表：优先 mediaCheckAsync + 轮询回调结果；超时则 imgSecCheck 同步兜底
 */
async function checkPublishImages(cloud, db, openid, fileIDs) {
  const ids = [...new Set(fileIDs.filter((id) => /^cloud:\/\//.test(id)))]
  if (!ids.length) {
    return { ok: true }
  }

  const submissions = []
  for (const fileID of ids) {
    const sub = await submitMediaCheckAsync(cloud, db, openid, fileID)
    if (sub.useSyncFallback) {
      const sync = await checkImageSync(cloud, fileID)
      if (!sync.ok) {
        await deleteCloudFiles(cloud, ids)
        return sync
      }
      continue
    }
    if (!sub.ok) {
      await deleteCloudFiles(cloud, ids)
      return sub
    }
    submissions.push(sub)
  }

  if (!submissions.length) {
    return { ok: true }
  }

  const traceIds = submissions.map((s) => s.traceId)
  const fileByTrace = Object.fromEntries(submissions.map((s) => [s.traceId, s.fileID]))
  const rows = await waitTraceResults(db, traceIds, 28000)
  if (!rows) {
    console.warn('[contentSecurity] mediaCheckAsync timeout, sync fallback for all')
    for (const fileID of ids) {
      const sync = await checkImageSync(cloud, fileID)
      if (!sync.ok) {
        await deleteCloudFiles(cloud, ids)
        return sync
      }
    }
    return { ok: true }
  }

  for (const row of rows) {
    const suggest = String(row.suggest || '').trim()
    if (suggest === 'risky') {
      await deleteCloudFiles(cloud, ids)
      return { ok: false, errMsg: SEC_VIOLATION_MSG }
    }
    if (mediaSuggestPass(suggest)) {
      continue
    }
    const fileID = row.file_id || fileByTrace[row.trace_id]
    if (!fileID) {
      await deleteCloudFiles(cloud, ids)
      return { ok: false, errMsg: SEC_VIOLATION_MSG }
    }
    console.warn('[contentSecurity] empty/unknown suggest, sync fallback', row.trace_id, suggest)
    const sync = await checkImageSync(cloud, fileID)
    if (!sync.ok) {
      await deleteCloudFiles(cloud, ids)
      return sync
    }
  }
  return { ok: true }
}

module.exports = {
  SEC_VIOLATION_MSG,
  IMG_TOO_LARGE_MSG,
  checkPublishTexts,
  checkPublishImages,
  deleteCloudFiles,
}
