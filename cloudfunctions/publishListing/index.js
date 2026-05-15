/**
 * 发布：provider -> provider_profiles；owner -> boarding_requests
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const DEFAULT_LAT = 31.2304
const DEFAULT_LNG = 121.4737

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) {
    return { ok: false, errMsg: '未获取到 OPENID' }
  }

  const role = event.role === 'provider' ? 'provider' : 'owner'
  const lat = typeof event.lat === 'number' && !Number.isNaN(event.lat) ? event.lat : DEFAULT_LAT
  const lng = typeof event.lng === 'number' && !Number.isNaN(event.lng) ? event.lng : DEFAULT_LNG

  const db = cloud.database()
  const now = db.serverDate()

  try {
    if (role === 'provider') {
      const p = event.provider || {}
      const phone = String(p.phone || '').trim()
      const wechatId = String(p.wechatId || '').trim()
      const years = parseInt(String(p.years || '0'), 10) || 0
      const petTypes = String(p.acceptPets || '')
        .split(/[,，、]/)
        .map((s) => s.trim())
        .filter(Boolean)

      const svcMed = !!p.svcMed
      const svcPickup = !!p.svcPickup
      const svcVideo = !!p.svcVideo
      const svcCamera = !!p.svcCamera
      const otherSvc = String(p.otherServices || '')
        .split(/[,，、]/)
        .map((s) => s.trim())
        .filter(Boolean)
      const serviceTags = []
      if (svcMed) serviceTags.push('喂药')
      if (svcPickup) serviceTags.push('接送')
      if (svcVideo) serviceTags.push('视频')
      if (svcCamera) serviceTags.push('摄像头')
      otherSvc.forEach((t) => {
        if (t && !serviceTags.includes(t)) serviceTags.push(t.slice(0, 20))
      })
      const envPhotos = Array.isArray(p.environmentPhotos)
        ? p.environmentPhotos.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 9)
        : []
      const locationCity = String(p.cityDistrict || '').trim().slice(0, 40) || '上海市'
      const summaryParts = serviceTags.slice()
      const serviceSummary = summaryParts.join('、').slice(0, 200) || '家庭寄养'

      const addRes = await db.collection('provider_profiles').add({
        data: {
          user_openid: openid,
          display_name: String(p.displayName || '寄养家庭').slice(0, 40),
          years_experience: years,
          pet_types: petTypes.length ? petTypes : ['dog'],
          accepted_sizes: ['small', 'medium'],
          max_pets: 2,
          walks_per_day: 2,
          has_private_room: true,
          has_yard: false,
          has_other_pets: false,
          has_children: false,
          supports_medication: svcMed,
          supports_pickup: svcPickup,
          service_tags: serviceTags.length ? serviceTags : ['家庭寄养'],
          environment_photos: envPhotos,
          service_summary: serviceSummary,
          env_description: envPhotos.length ? '详见上传的环境照片' : '',
          price_description: '价格线下沟通确认，平台不收款',
          phone,
          wechat_id: wechatId,
          social_accounts: String(p.social || '').slice(0, 120),
          location_city: locationCity,
          lat,
          lng,
          profile_completeness: 60,
          status: 'published',
          created_at: now,
        },
      })
      return { ok: true, kind: 'provider', id: addRes._id }
    }

    const o = event.owner || {}
    const phone = String(o.phone || '').trim()
    const wechatId = String(o.wechatId || '').trim()

    const addRes = await db.collection('boarding_requests').add({
      data: {
        owner_openid: openid,
        pet_name: String(o.petName || '宠物').slice(0, 20),
        pet_type: String(o.petType || 'dog').slice(0, 20),
        size: String(o.size || 'small').slice(0, 20),
        boarding_period: 'short_term',
        start_date: '',
        end_date: '',
        date_range_text: String(o.periodText || '').slice(0, 80),
        location_city: '上海市',
        lat,
        lng,
        requirements: String(o.distanceText || '').trim()
          ? [String(o.distanceText).slice(0, 80)]
          : [],
        description: String(o.description || '').slice(0, 500),
        pet_photos: Array.isArray(o.petPhotos)
          ? o.petPhotos.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 3)
          : [],
        phone,
        wechat_id: wechatId,
        social_accounts: String(o.social || '').slice(0, 120),
        status: 'published',
        created_at: now,
      },
    })
    return { ok: true, kind: 'boarding_request', id: addRes._id }
  } catch (err) {
    return { ok: false, errMsg: err.message || String(err) }
  }
}
