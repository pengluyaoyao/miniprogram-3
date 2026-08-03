/** 与 miniprogram/data/regions.json 保持同步（发布时一并上传 regions.json） */
const REGIONS = require('./regions.json')

const GRID_STEP = 0.002

function quantizeLocationRough(lat, lng) {
  return {
    lat: Math.round(lat / GRID_STEP) * GRID_STEP,
    lng: Math.round(lng / GRID_STEP) * GRID_STEP,
  }
}

function resolveRegion(city, district) {
  const c = String(city || '').trim()
  const d = String(district || '').trim()
  if (!c || !d) {
    return null
  }
  for (const region of REGIONS) {
    if (region.city !== c) {
      continue
    }
    const found = region.districts.find((x) => x.name === d)
    if (found) {
      const q = quantizeLocationRough(found.lat, found.lng)
      return {
        locationCity: c === '其他' ? d : `${c}${d}`,
        lat: q.lat,
        lng: q.lng,
      }
    }
  }
  return null
}

function resolveRegionFromLabel(label) {
  const text = String(label || '').trim()
  if (!text) {
    return null
  }
  for (const region of REGIONS) {
    if (!text.startsWith(region.city)) {
      continue
    }
    const rest = text.slice(region.city.length)
    const found = region.districts.find((x) => rest === x.name || rest.includes(x.name))
    if (found) {
      const q = quantizeLocationRough(found.lat, found.lng)
        return {
          locationCity: region.city === '其他' ? found.name : `${region.city}${found.name}`,
          lat: q.lat,
          lng: q.lng,
        }
    }
  }
  for (const region of REGIONS) {
    for (const d of region.districts) {
      if (text.includes(d.name)) {
        const q = quantizeLocationRough(d.lat, d.lng)
        return {
          locationCity: region.city === '其他' ? d.name : `${region.city}${d.name}`,
          lat: q.lat,
          lng: q.lng,
        }
      }
    }
  }
  return null
}

function resolveLocationFromPayload(city, district, cityDistrict) {
  const byParts = resolveRegion(city, district)
  if (byParts) {
    return byParts
  }
  const byLabel = resolveRegionFromLabel(cityDistrict)
  if (byLabel) {
    return byLabel
  }
  return null
}

module.exports = {
  resolveLocationFromPayload,
  quantizeLocationRough,
}
