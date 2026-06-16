/**
 * 寄养家庭发布前：内容安全检测 + MiniMax 生成小红书文案
 */
const cloud = require('wx-server-sdk')
const axios = require('axios')
const { resolveLocationFromPayload } = require('./districtCenters')
const {
  SEC_VIOLATION_MSG,
  checkPublishTexts,
  checkPublishImages,
} = require('./contentSecurity')
const {
  TEXT_SYSTEM_PROMPT,
  buildTextUserMessageContent,
  parseJsonFromModelText,
} = require('./prompts')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const DEFAULT_BASE = 'https://api.minimaxi.com'
const MAX_VISION_IMAGES = 3

function getMinimaxConfig() {
  const apiKey = process.env.MINIMAX_API_KEY || ''
  if (!apiKey) {
    throw new Error('未配置 MINIMAX_API_KEY，请在云函数环境变量中设置')
  }
  return {
    apiKey,
    baseUrl: (process.env.MINIMAX_BASE_URL || DEFAULT_BASE).replace(/\/$/, ''),
    textModel: process.env.MINIMAX_TEXT_MODEL || 'MiniMax-M2.5',
    visionModel: process.env.MINIMAX_VISION_MODEL || 'MiniMax-M3',
  }
}

function locationFromForm(form) {
  const resolved = resolveLocationFromPayload(form.city, form.district, form.cityDistrict)
  if (!resolved) {
    return { ok: false, errMsg: '请选择有效的市、区' }
  }
  return { ok: true, ...resolved }
}

function buildServiceItems(p) {
  const items = []
  if (p.svcMed) items.push('喂药')
  if (p.svcPickup) items.push('接送')
  if (p.svcVideo) items.push('视频')
  if (p.svcCamera) items.push('摄像头')
  return items
}

function buildListingInput(p, loc, imageUrls) {
  const years = parseInt(String(p.years || '0'), 10) || 0
  const acceptPets = String(p.acceptPets || '')
    .split(/[,，、]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const envPhotos = Array.isArray(p.environmentPhotos) ? p.environmentPhotos : []
  return {
    displayName: String(p.displayName || '').trim(),
    locationCity: loc.locationCity,
    yearsExperience: years || undefined,
    acceptPets: acceptPets.length ? acceptPets : ['未填写'],
    serviceItems: buildServiceItems(p),
    otherServices: String(p.otherServices || '').trim() || '无',
    envDescription: envPhotos.length ? '详见上传的环境照片' : '见表单说明',
    priceDescription: '价格线下沟通确认，平台不收款',
    imageUrls,
  }
}

async function resolveImageHttpsUrls(cloudApi, fileIDs) {
  const ids = fileIDs
    .map((x) => String(x || '').trim())
    .filter((id) => /^cloud:\/\//.test(id))
    .slice(0, MAX_VISION_IMAGES)
  if (!ids.length) {
    return []
  }
  const res = await cloudApi.getTempFileURL({ fileList: ids })
  return (res.fileList || [])
    .filter((item) => item && item.status === 0 && item.tempFileURL)
    .map((item) => item.tempFileURL)
}

async function chatCompletion(cfg, { model, messages, maxTokens, disableThinking }) {
  const body = {
    model,
    messages,
    max_completion_tokens: maxTokens,
    temperature: 0.85,
  }
  if (disableThinking) {
    body.thinking = { type: 'disabled' }
  }
  const res = await axios.post(`${cfg.baseUrl}/v1/chat/completions`, body, {
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 90000,
  })
  const choice = res.data && res.data.choices && res.data.choices[0]
  const content = choice && choice.message && choice.message.content
  if (!content) {
    throw new Error('MiniMax 未返回文案内容')
  }
  return typeof content === 'string' ? content : JSON.stringify(content)
}

async function generateCopy(listing) {
  const cfg = getMinimaxConfig()
  const userContent = buildTextUserMessageContent(listing)
  const hasImages = listing.imageUrls && listing.imageUrls.length > 0
  const model = hasImages ? cfg.visionModel : cfg.textModel
  const raw = await chatCompletion(cfg, {
    model,
    messages: [
      { role: 'system', content: TEXT_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    maxTokens: hasImages ? 4096 : 2048,
    disableThinking: /m3/i.test(model),
  })
  const copy = parseJsonFromModelText(raw)
  return {
    title: String(copy.title || '').slice(0, 80),
    body: String(copy.body || '').slice(0, 2000),
    hashtags: Array.isArray(copy.hashtags)
      ? copy.hashtags.map((t) => String(t).slice(0, 30)).slice(0, 8)
      : [],
    highlights: Array.isArray(copy.highlights)
      ? copy.highlights.map((t) => String(t).slice(0, 20)).slice(0, 5)
      : [],
    coverImagePrompt: String(copy.coverImagePrompt || '').slice(0, 500),
  }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) {
    return { ok: false, errMsg: '未获取到 OPENID' }
  }

  const p = event.provider || {}
  if (!String(p.displayName || '').trim()) {
    return { ok: false, errMsg: '请填写寄养家庭名称' }
  }

  const loc = locationFromForm(p)
  if (!loc.ok) {
    return loc
  }

  const envPhotos = Array.isArray(p.environmentPhotos)
    ? p.environmentPhotos.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 9)
    : []

  const db = cloud.database()

  try {
    const textCheck = await checkPublishTexts(cloud, openid, [
      p.displayName,
      p.acceptPets,
      p.otherServices,
      p.social,
      p.phone,
      p.wechatId,
    ])
    if (!textCheck.ok) {
      return textCheck
    }

    const imgCheck = await checkPublishImages(cloud, db, openid, envPhotos)
    if (!imgCheck.ok) {
      return imgCheck
    }

    const imageUrls = await resolveImageHttpsUrls(cloud, envPhotos)
    const listing = buildListingInput(p, loc, imageUrls)
    const copy = await generateCopy(listing)

    const publishPayload = {
      role: 'provider',
      listingId: '',
      provider: {
        displayName: p.displayName,
        years: p.years,
        acceptPets: p.acceptPets,
        city: p.city,
        district: p.district,
        cityDistrict: p.cityDistrict,
        svcMed: !!p.svcMed,
        svcPickup: !!p.svcPickup,
        svcVideo: !!p.svcVideo,
        svcCamera: !!p.svcCamera,
        otherServices: p.otherServices,
        environmentPhotos: envPhotos,
        phone: p.phone,
        wechatId: p.wechatId,
        social: p.social,
      },
    }

    return { ok: true, copy, publishPayload }
  } catch (err) {
    const msg = err.message || String(err)
    if (msg.includes('87014') || msg.includes('risky')) {
      return { ok: false, errMsg: SEC_VIOLATION_MSG }
    }
    console.error('[generateXhsCopy]', msg)
    return { ok: false, errMsg: msg.includes('MINIMAX') ? msg : `文案生成失败：${msg}` }
  }
}
