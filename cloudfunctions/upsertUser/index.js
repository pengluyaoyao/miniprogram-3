/**
 * 小程序登录后调用：用云函数身份解析 OPENID/UNIONID，并合并前端 getUserProfile 资料写入 users。
 * 手机号、微信号等业务字段在资料表单中再更新同一文档即可。
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const unionid = wxContext.UNIONID || ''
  const appid = wxContext.APPID || ''

  if (!openid) {
    return { ok: false, errMsg: '无法获取 OPENID，请确认已走云开发初始化且通过 wx.cloud.callFunction 调用' }
  }

  const {
    nickName = '',
    avatarUrl = '',
    gender = 0,
    country = '',
    province = '',
    city = '',
    language = '',
  } = event || {}

  const db = cloud.database()
  const users = db.collection('users')
  const now = db.serverDate()

  const profilePatch = {
    openid,
    unionid,
    appid,
    nickname: nickName,
    avatar_url: avatarUrl,
    gender,
    country,
    province,
    city,
    language,
    updated_at: now,
  }

  try {
    const existing = await users.where({ openid }).limit(1).get()

    if (existing.data.length === 0) {
      await users.add({
        data: {
          ...profilePatch,
          role: 'owner',
          status: 'active',
          phone: '',
          wechat_id: '',
          social_accounts: '',
          lat: null,
          lng: null,
          created_at: now,
        },
      })
    } else {
      const docId = existing.data[0]._id
      await users.doc(docId).update({
        data: profilePatch,
      })
    }

    return {
      ok: true,
      openid,
      unionid: unionid || undefined,
      nickname: nickName,
      avatarUrl,
    }
  } catch (err) {
    return {
      ok: false,
      errMsg: err.message || String(err),
    }
  }
}
