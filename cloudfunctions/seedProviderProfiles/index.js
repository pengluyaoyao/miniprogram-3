/**
 * 一次性导入小红书评论整理的寄养家庭数据到 provider_profiles。
 * 调用：{ confirm: "SEED_XHS_PROFILES_V1", dryRun?: true, offset?: 0, limit?: 175 }
 */
const cloud = require('wx-server-sdk')
const { resolveLocationFromPayload } = require('./districtCenters')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const SEED_USER_OPENID = 'ofDVP12SiQNSpXheJGORXnJhhJcI'
const CONFIRM_TOKEN = 'SEED_XHS_PROFILES_V1'
const DEFAULT_FALLBACK = { lat: 39.9042, lng: 116.4074, locationCity: '北京市' }

const profiles = require('./xhs_profiles.json')

function toBool(v) {
  return v === true || v === 'true'
}

function toInt(v, fallback = 0) {
  const n = parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) ? n : fallback
}

function normalizeRecord(raw, index) {
  const loc =
    resolveLocationFromPayload(null, null, raw.location_city) ||
    DEFAULT_FALLBACK

  const envPhotos = Array.isArray(raw.environment_photos)
    ? raw.environment_photos.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 9)
    : []

  const petTypes = Array.isArray(raw.pet_types)
    ? raw.pet_types.map((t) => String(t || '').trim()).filter(Boolean)
    : []

  const serviceTags = Array.isArray(raw.service_tags)
    ? raw.service_tags.map((t) => String(t || '').trim()).filter(Boolean)
    : []

  const acceptedSizes = Array.isArray(raw.accepted_sizes)
    ? raw.accepted_sizes.map(String).filter(Boolean)
    : []

  const xhsHashtags = Array.isArray(raw.xhs_hashtags)
    ? raw.xhs_hashtags.map((t) => String(t || '').trim()).filter(Boolean).slice(0, 8)
    : []

  const xhsHighlights = Array.isArray(raw.xhs_highlights)
    ? raw.xhs_highlights.map((t) => String(t || '').trim()).filter(Boolean).slice(0, 5)
    : []

  const envDescription = String(raw.env_description || '').trim().slice(0, 500)

  return {
    user_openid: SEED_USER_OPENID,
    display_name: String(raw.display_name || `寄养家庭${index + 1}`).slice(0, 40),
    years_experience: toInt(raw.years_experience, 0),
    pet_types: petTypes.length ? petTypes : ['狗'],
    location_city: loc.locationCity || String(raw.location_city || '').slice(0, 40),
    accepted_sizes: acceptedSizes.length ? acceptedSizes : ['small', 'medium'],
    max_pets: toInt(raw.max_pets, 2),
    walks_per_day: toInt(raw.walks_per_day, 2),
    has_private_room: raw.has_private_room === '' ? true : toBool(raw.has_private_room) || true,
    has_yard: toBool(raw.has_yard),
    has_other_pets: toBool(raw.has_other_pets),
    has_children: toBool(raw.has_children),
    supports_medication: toBool(raw.supports_medication),
    supports_pickup: toBool(raw.supports_pickup),
    service_tags: serviceTags.length ? serviceTags : ['家庭寄养'],
    service_summary: String(raw.service_summary || serviceTags.join('、') || '家庭寄养').slice(0, 200),
    env_description: envDescription || (envPhotos.length ? '详见上传的环境照片' : ''),
    environment_photos: envPhotos,
    price_description: String(raw.price_description || '价格线下沟通确认，平台不收款').slice(0, 120),
    phone: String(raw.phone || '').trim(),
    wechat_id: String(raw.wechat_id || '').trim(),
    social_accounts: String(raw.social_accounts || '').slice(0, 120),
    lat: typeof loc.lat === 'number' ? loc.lat : DEFAULT_FALLBACK.lat,
    lng: typeof loc.lng === 'number' ? loc.lng : DEFAULT_FALLBACK.lng,
    profile_completeness: toInt(raw.profile_completeness, 60),
    status: 'published',
    xhs_title: String(raw.xhs_title || '').slice(0, 80),
    xhs_body: String(raw.xhs_body || '').slice(0, 2000),
    xhs_hashtags: xhsHashtags,
    xhs_highlights: xhsHighlights,
    seed_source: 'xhs_comments_v1',
    seed_index: index,
  }
}

exports.main = async (event) => {
  if (event.confirm !== CONFIRM_TOKEN) {
    return {
      ok: false,
      errMsg: `请传入 confirm === "${CONFIRM_TOKEN}" 以确认执行（防止误触）`,
    }
  }

  const dryRun = event.dryRun === true
  const offset = Math.max(0, parseInt(String(event.offset || 0), 10) || 0)
  const limit = Math.min(
    profiles.length,
    Math.max(1, parseInt(String(event.limit || profiles.length), 10) || profiles.length)
  )
  const slice = profiles.slice(offset, offset + limit)

  const db = cloud.database()
  const now = db.serverDate()
  const results = []
  let imported = 0
  let failed = 0

  for (let i = 0; i < slice.length; i++) {
    const index = offset + i
    const raw = slice[i]
    const data = normalizeRecord(raw, index)
    data.created_at = now
    data.updated_at = now

    if (dryRun) {
      results.push({ index, display_name: data.display_name, ok: true, dryRun: true })
      imported++
      continue
    }

    try {
      const addRes = await db.collection('provider_profiles').add({ data })
      results.push({
        index,
        display_name: data.display_name,
        _id: addRes._id,
        ok: true,
      })
      imported++
    } catch (err) {
      failed++
      results.push({
        index,
        display_name: data.display_name,
        ok: false,
        error: err.message || String(err),
      })
    }
  }

  return {
    ok: failed === 0,
    dryRun,
    totalInFile: profiles.length,
    offset,
    limit: slice.length,
    imported,
    failed,
    user_openid: SEED_USER_OPENID,
    results,
    hint: dryRun
      ? 'dryRun 未写入数据库；去掉 dryRun 后重新调用以正式导入'
      : '导入完成；请在云开发数据库 provider_profiles 核对记录',
  }
}
