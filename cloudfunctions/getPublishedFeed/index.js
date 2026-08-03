const cloud = require('wx-server-sdk')
const { buildLocationSearchRegexp } = require('./locationSearch')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 50

function enrichDoc(doc) {
  return {
    ...doc,
    distance_km: null,
    distance_label: String(doc.location_city || '').trim().slice(0, 24) || '未填市区',
  }
}

function parsePaging(event) {
  const skip = Math.max(0, parseInt(String(event.skip || 0), 10) || 0)
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(String(event.limit || DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
  )
  return { skip, limit }
}

async function fetchPublishedPage(db, collectionName, cityQuery, skip, limit) {
  const city = String(cityQuery || '').trim()
  const where = { status: 'published' }
  if (city) {
    const regexp = buildLocationSearchRegexp(city)
    where.location_city = db.RegExp({
      regexp: regexp || city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      options: 'i',
    })
  }

  const query = db.collection(collectionName).where(where)
  const countRes = await query.count()
  const total = countRes.total || 0

  let listRes
  try {
    listRes = await query.orderBy('created_at', 'desc').skip(skip).limit(limit).get()
  } catch (err) {
    listRes = await query.skip(skip).limit(limit).get()
  }

  const docs = (listRes.data || []).map(enrichDoc)
  const hasMore = skip + docs.length < total

  return { docs, total, hasMore }
}

exports.main = async (event) => {
  const db = cloud.database()
  const cityQuery = String(event.cityQuery || '').trim()
  const searchMode = cityQuery ? 'city' : 'all'
  const { skip, limit } = parsePaging(event)
  const listType =
    event.listType === 'provider' || event.listType === 'request' ? event.listType : ''

  try {
    if (listType === 'provider') {
      const provPage = await fetchPublishedPage(db, 'provider_profiles', cityQuery, skip, limit)
      return {
        ok: true,
        searchMode,
        cityQuery,
        skip,
        limit,
        listType: 'provider',
        providers: provPage.docs,
        requests: [],
        providerTotal: provPage.total,
        requestTotal: 0,
        hasMoreProviders: provPage.hasMore,
        hasMoreRequests: false,
      }
    }

    if (listType === 'request') {
      const reqPage = await fetchPublishedPage(db, 'boarding_requests', cityQuery, skip, limit)
      return {
        ok: true,
        searchMode,
        cityQuery,
        skip,
        limit,
        listType: 'request',
        providers: [],
        requests: reqPage.docs,
        providerTotal: 0,
        requestTotal: reqPage.total,
        hasMoreProviders: false,
        hasMoreRequests: reqPage.hasMore,
      }
    }

    const [provPage, reqPage] = await Promise.all([
      fetchPublishedPage(db, 'provider_profiles', cityQuery, skip, limit),
      fetchPublishedPage(db, 'boarding_requests', cityQuery, skip, limit),
    ])

    return {
      ok: true,
      searchMode,
      cityQuery,
      skip,
      limit,
      providers: provPage.docs,
      requests: reqPage.docs,
      providerTotal: provPage.total,
      requestTotal: reqPage.total,
      hasMoreProviders: provPage.hasMore,
      hasMoreRequests: reqPage.hasMore,
    }
  } catch (err) {
    return {
      ok: false,
      errMsg: err.message || String(err),
      searchMode,
      cityQuery,
      skip,
      limit,
      providers: [],
      requests: [],
      providerTotal: 0,
      requestTotal: 0,
      hasMoreProviders: false,
      hasMoreRequests: false,
    }
  }
}
