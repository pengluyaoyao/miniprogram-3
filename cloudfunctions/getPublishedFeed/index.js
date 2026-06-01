const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const MAX_RETURN = 50
const MAX_FETCH = 100

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

function enrichDoc(doc) {
  return {
    ...doc,
    distance_km: null,
    distance_label: String(doc.location_city || '').trim().slice(0, 24) || '未填市区',
  }
}

function processDocs(docs, cityQuery) {
  const q = String(cityQuery || '').trim()
  let list = docs
  if (q) {
    list = docs.filter((doc) => matchCityQuery(doc, q))
  }
  return list.slice(0, MAX_RETURN).map(enrichDoc)
}

exports.main = async (event) => {
  const db = cloud.database()
  const cityQuery = String(event.cityQuery || '').trim()
  const searchMode = cityQuery ? 'city' : 'all'

  try {
    const [provRes, reqRes] = await Promise.all([
      db.collection('provider_profiles').where({ status: 'published' }).limit(MAX_FETCH).get(),
      db.collection('boarding_requests').where({ status: 'published' }).limit(MAX_FETCH).get(),
    ])
    const provRaw = provRes.data || []
    const reqRaw = reqRes.data || []

    return {
      ok: true,
      searchMode,
      cityQuery,
      providers: processDocs(provRaw, cityQuery),
      requests: processDocs(reqRaw, cityQuery),
    }
  } catch (err) {
    return {
      ok: false,
      errMsg: err.message || String(err),
      searchMode,
      cityQuery,
      providers: [],
      requests: [],
    }
  }
}
