/**
 * 发布：provider -> provider_profiles；owner -> boarding_requests
 */
const cloud = require('wx-server-sdk')
const { resolveLocationFromPayload } = require('./districtCenters')
const {
  SEC_VIOLATION_MSG,
  checkPublishTexts,
  checkPublishImages,
} = require('./contentSecurity')
const { formatBoardingRangeLabel } = require('./boardingPeriod')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

function locationFromForm(form) {
  const resolved = resolveLocationFromPayload(form.city, form.district, form.cityDistrict)
  if (!resolved) {
    return { ok: false, errMsg: '请选择有效的市、区' }
  }
  return { ok: true, ...resolved }
}

async function assertOwnedListing(db, openid, listingId, listType) {
  const coll = listType === 'provider' ? 'provider_profiles' : 'boarding_requests'
  const ownerField = listType === 'provider' ? 'user_openid' : 'owner_openid'
  const res = await db.collection(coll).doc(listingId).get()
  const doc = res.data
  if (!doc || doc[ownerField] !== openid) {
    return { ok: false, errMsg: '无权修改该发布' }
  }
  if (doc.status === 'hidden') {
    return { ok: false, errMsg: '已删除的记录无法修改' }
  }
  return { ok: true, coll, doc }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) {
    return { ok: false, errMsg: '未获取到 OPENID' }
  }

  const role = event.role === 'provider' ? 'provider' : 'owner'
  const listingId = String(event.listingId || '').trim()
  const isUpdate = !!listingId
  const db = cloud.database()
  const now = db.serverDate()

  try {
    if (isUpdate) {
      const owned = await assertOwnedListing(db, openid, listingId, role)
      if (!owned.ok) {
        return owned
      }
    }

    if (role === 'provider') {
      const p = event.provider || {}
      const loc = locationFromForm(p)
      if (!loc.ok) {
        return loc
      }
      const envPhotos = Array.isArray(p.environmentPhotos)
        ? p.environmentPhotos.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 9)
        : []
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
      const summaryParts = serviceTags.slice()
      const serviceSummary = summaryParts.join('、').slice(0, 200) || '家庭寄养'

      const providerData = {
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
        location_city: loc.locationCity,
        lat: loc.lat,
        lng: loc.lng,
        profile_completeness: 60,
        status: 'published',
        updated_at: now,
      }
      if (isUpdate) {
        await db.collection('provider_profiles').doc(listingId).update({ data: providerData })
        return { ok: true, kind: 'provider', id: listingId, updated: true }
      }
      const addRes = await db.collection('provider_profiles').add({
        data: {
          user_openid: openid,
          ...providerData,
          created_at: now,
        },
      })
      return { ok: true, kind: 'provider', id: addRes._id }
    }

    const o = event.owner || {}
    const loc = locationFromForm(o)
    if (!loc.ok) {
      return loc
    }
    const petPhotos = Array.isArray(o.petPhotos)
      ? o.petPhotos.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 3)
      : []
    const startDate = String(o.boardingStartDate || '').trim().slice(0, 10)
    const endDate = String(o.boardingEndDate || '').trim().slice(0, 10)
    const dateRangeText = formatBoardingRangeLabel(startDate, endDate)
    if (!startDate || !endDate) {
      return { ok: false, errMsg: '请选择寄养起止日期' }
    }
    if (endDate < startDate) {
      return { ok: false, errMsg: '结束日期不能早于开始日期' }
    }
    const textCheck = await checkPublishTexts(cloud, openid, [
      o.petName,
      o.petType,
      o.size,
      dateRangeText,
      o.distanceText,
      o.description,
      o.social,
      o.phone,
      o.wechatId,
    ])
    if (!textCheck.ok) {
      return textCheck
    }
    const imgCheck = await checkPublishImages(cloud, db, openid, petPhotos)
    if (!imgCheck.ok) {
      return imgCheck
    }
    const phone = String(o.phone || '').trim()
    const wechatId = String(o.wechatId || '').trim()

    const requestData = {
      pet_name: String(o.petName || '宠物').slice(0, 20),
      pet_type: String(o.petType || 'dog').slice(0, 20),
      size: String(o.size || 'small').slice(0, 20),
      boarding_period: 'short_term',
      start_date: startDate,
      end_date: endDate,
      date_range_text: dateRangeText.slice(0, 80),
      location_city: loc.locationCity,
      lat: loc.lat,
      lng: loc.lng,
      requirements: String(o.distanceText || '').trim()
        ? [String(o.distanceText).slice(0, 80)]
        : [],
      description: String(o.description || '').slice(0, 500),
      pet_photos: petPhotos,
      phone,
      wechat_id: wechatId,
      social_accounts: String(o.social || '').slice(0, 120),
      status: 'published',
      updated_at: now,
    }
    if (isUpdate) {
      await db.collection('boarding_requests').doc(listingId).update({ data: requestData })
      return { ok: true, kind: 'boarding_request', id: listingId, updated: true }
    }
    const addRes = await db.collection('boarding_requests').add({
      data: {
        owner_openid: openid,
        ...requestData,
        created_at: now,
      },
    })
    return { ok: true, kind: 'boarding_request', id: addRes._id }
  } catch (err) {
    const msg = err.message || String(err)
    if (msg.includes('87014') || msg.includes('risky')) {
      return { ok: false, errMsg: SEC_VIOLATION_MSG }
    }
    return { ok: false, errMsg: msg }
  }
}
