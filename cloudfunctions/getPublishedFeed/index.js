const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const MAX_RETURN = 50
const MAX_RADIUS_KM = 50
/** 定位/市区筛选前从库中拉取的上限 */
const MAX_FETCH = 100

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistanceKm(km) {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  }
  if (km < 10) {
    return `${km.toFixed(1)}km`
  }
  return `${Math.round(km)}km`
}

function docLatLng(doc) {
  const lat = typeof doc.lat === 'number' ? doc.lat : Number(doc.lat)
  const lng = typeof doc.lng === 'number' ? doc.lng : Number(doc.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }
  return { lat, lng }
}

function docCityText(doc) {
  return String(doc.location_city || '').trim().toLowerCase()
}

function matchCityQuery(doc, cityQuery) {
  const q = String(cityQuery || '').trim().toLowerCase()
  if (!q) {
    return true
  }
  const city = docCityText(doc)
  return city.length > 0 && city.includes(q)
}

function processDocsByGps(docs, userLat, userLng) {
  const withDist = []
  docs.forEach((doc) => {
    const pos = docLatLng(doc)
    if (!pos) {
      return
    }
    const km = haversineKm(userLat, userLng, pos.lat, pos.lng)
    if (km <= MAX_RADIUS_KM) {
      withDist.push({ doc, km })
    }
  })
  withDist.sort((a, b) => a.km - b.km)
  return withDist.slice(0, MAX_RETURN).map(({ doc, km }) => ({
    ...doc,
    distance_km: Math.round(km * 100) / 100,
    distance_label: formatDistanceKm(km),
  }))
}

function processDocsByCity(docs, cityQuery) {
  return docs
    .filter((doc) => matchCityQuery(doc, cityQuery))
    .slice(0, MAX_RETURN)
    .map((doc) => ({
      ...doc,
      distance_km: null,
      distance_label: String(doc.location_city || '').trim().slice(0, 20),
    }))
}

function processDocsAll(docs) {
  return docs.slice(0, MAX_RETURN).map((doc) => ({
    ...doc,
    distance_km: null,
    distance_label: '',
  }))
}

exports.main = async (event) => {
  const db = cloud.database()
  const lat = typeof event.lat === 'number' && !Number.isNaN(event.lat) ? event.lat : null
  const lng = typeof event.lng === 'number' && !Number.isNaN(event.lng) ? event.lng : null
  const hasLocation = lat != null && lng != null
  const cityQuery = String(event.cityQuery || '').trim()

  try {
    const [provRes, reqRes] = await Promise.all([
      db.collection('provider_profiles').where({ status: 'published' }).limit(MAX_FETCH).get(),
      db.collection('boarding_requests').where({ status: 'published' }).limit(MAX_FETCH).get(),
    ])
    const provRaw = provRes.data || []
    const reqRaw = reqRes.data || []

    let providers
    let requests
    let searchMode = 'all'
    let located = false

    if (cityQuery) {
      searchMode = 'city'
      providers = processDocsByCity(provRaw, cityQuery)
      requests = processDocsByCity(reqRaw, cityQuery)
    } else if (hasLocation) {
      searchMode = 'gps'
      located = true
      providers = processDocsByGps(provRaw, lat, lng)
      requests = processDocsByGps(reqRaw, lat, lng)
    } else {
      providers = processDocsAll(provRaw)
      requests = processDocsAll(reqRaw)
    }

    return {
      ok: true,
      searchMode,
      located,
      cityQuery: cityQuery || '',
      providers,
      requests,
    }
  } catch (err) {
    return {
      ok: false,
      errMsg: err.message || String(err),
      searchMode: cityQuery ? 'city' : hasLocation ? 'gps' : 'all',
      located: hasLocation,
      cityQuery: cityQuery || '',
      providers: [],
      requests: [],
    }
  }
}
