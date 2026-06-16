/**
 * 用户向平台提交意见/反馈，写入 platform_feedback，可选通知管理员（订阅消息）
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const SEC_VIOLATION_MSG = '内容含有违规信息，请修改后重试'
const CATEGORIES = new Set(['功能建议', '问题反馈', '合作咨询', '其他'])

const DEFAULT_SUBSCRIBE_TMPL = '9JxH1WSbK_o3VkWScncrkAQIYFxYFGijFnet30TaIR8'

async function checkText(cloudApi, openid, content) {
  const text = String(content || '').trim()
  if (!text) {
    return { ok: true }
  }
  try {
    const res = await cloudApi.openapi.security.msgSecCheck({
      version: 2,
      openid,
      scene: 3,
      content: text.slice(0, 2500),
    })
    const suggest =
      res?.result?.result?.suggest ||
      res?.result?.suggest ||
      (res?.errCode === 0 ? 'pass' : '')
    if (suggest === 'risky' || res?.errCode === 87014) {
      return { ok: false, errMsg: SEC_VIOLATION_MSG }
    }
    return { ok: true }
  } catch (e) {
    const code = e.errCode || e.errcode
    if (code === 87014) {
      return { ok: false, errMsg: SEC_VIOLATION_MSG }
    }
    return { ok: false, errMsg: SEC_VIOLATION_MSG }
  }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) {
    return { ok: false, errMsg: '未获取到 OPENID' }
  }

  let category = String(event.category || '其他').trim().slice(0, 20)
  if (!CATEGORIES.has(category)) {
    category = '其他'
  }
  const body = String(event.body || '').trim().slice(0, 800)
  const contactPhone = String(event.contactPhone || '').trim().slice(0, 20)
  const contactWechat = String(event.contactWechat || '').trim().slice(0, 40)
  const nickname = String(event.nickname || '').trim().slice(0, 40)

  if (!body) {
    return { ok: false, errMsg: '请填写留言内容' }
  }
  if (body.length < 5) {
    return { ok: false, errMsg: '留言内容至少 5 个字' }
  }

  const textCheck = await checkText(cloud, openid, [category, body, contactPhone, contactWechat, nickname].join('\n'))
  if (!textCheck.ok) {
    return textCheck
  }

  const db = cloud.database()
  try {
    await db.collection('platform_feedback').add({
      data: {
        from_openid: openid,
        nickname: nickname || '',
        category,
        body,
        contact_phone: contactPhone,
        contact_wechat: contactWechat,
        status: 'new',
        created_at: db.serverDate(),
      },
    })

    const adminOpenid = String(process.env.ADMIN_OPENID || '').trim()
    const tmplId = process.env.SUBSCRIBE_TMPL_FEEDBACK || process.env.SUBSCRIBE_TMPL_NEW_MSG || DEFAULT_SUBSCRIBE_TMPL
    const miniprogramState = process.env.SUBSCRIBE_MINIPROGRAM_STATE || 'formal'

    if (adminOpenid && tmplId) {
      try {
        const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ')
        const preview = `[${category}] ${body}`.slice(0, 20)
        await cloud.openapi.subscribeMessage.send({
          touser: adminOpenid,
          templateId: tmplId,
          page: 'pages/db-init/db-init',
          lang: 'zh_CN',
          data: {
            thing1: { value: '用户反馈' },
            thing4: { value: preview },
            time3: { value: nowStr },
            thing6: { value: nickname ? nickname.slice(0, 20) : '微信用户' },
          },
          miniprogramState,
        })
      } catch (e) {
        console.warn('[submitFeedback] subscribeMessage', e && (e.message || e))
      }
    }

    return { ok: true }
  } catch (err) {
    return { ok: false, errMsg: err.message || String(err) }
  }
}
