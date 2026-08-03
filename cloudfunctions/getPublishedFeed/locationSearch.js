const REGIONS = require('./regions.json')

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripAdminSuffix(name) {
  return String(name || '').replace(
    /(特别行政区|自治区|自治州|地区|盟|新区|街道|市|区|县)$/g,
    ''
  )
}

function normalizeLocationSearchText(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s/g, '')
    .replace(/(特别行政区|自治区|自治州|地区|盟|新区|街道|市|区|县)/g, '')
}

/** 将「北京朝阳」解析为 ['北京','朝阳'] 等搜索 token */
function parseSearchTokens(query) {
  const q = String(query || '').trim().replace(/\s/g, '')
  if (!q) {
    return []
  }

  const tokens = []
  let rest = q

  const cityEntries = REGIONS.map((region) => ({
    label: region.city,
    key: stripAdminSuffix(region.city),
  })).sort((a, b) => b.label.length - a.label.length)

  for (const { label, key } of cityEntries) {
    if (rest.startsWith(label)) {
      tokens.push(key || label)
      rest = rest.slice(label.length)
      break
    }
    if (key.length >= 2 && rest.startsWith(key)) {
      tokens.push(key)
      rest = rest.slice(key.length)
      break
    }
  }

  const districtEntries = []
  for (const region of REGIONS) {
    for (const d of region.districts) {
      districtEntries.push({
        label: d.name,
        key: stripAdminSuffix(d.name),
      })
    }
  }
  districtEntries.sort((a, b) => b.label.length - a.label.length)

  while (rest.length > 0) {
    let matched = false
    for (const { label, key } of districtEntries) {
      if (rest.startsWith(label)) {
        tokens.push(key || label)
        rest = rest.slice(label.length)
        matched = true
        break
      }
      if (key.length >= 2 && rest.startsWith(key)) {
        tokens.push(key)
        rest = rest.slice(key.length)
        matched = true
        break
      }
    }
    if (!matched) {
      const chunk = rest.slice(0, Math.min(4, rest.length))
      tokens.push(chunk)
      rest = rest.slice(chunk.length)
    }
  }

  if (!tokens.length) {
    tokens.push(stripAdminSuffix(q) || q)
  }
  return tokens.filter(Boolean)
}

/**
 * 构建宽松 location_city 正则：
 * 「北京朝阳」可匹配「北京市朝阳区…」
 */
function buildLocationSearchRegexp(query) {
  const q = String(query || '').trim()
  if (!q) {
    return null
  }

  const tokens = parseSearchTokens(q)
  const adminGap = '[市区县镇乡]?'
  const parts = tokens.map((token) => {
    const core = escapeRegExp(stripAdminSuffix(token) || token)
    return `${core}${adminGap}`
  })
  return parts.join('.*?')
}

function matchesLocationSearch(locationCity, cityQuery) {
  const q = normalizeLocationSearchText(cityQuery)
  if (!q) {
    return true
  }
  const loc = normalizeLocationSearchText(locationCity)
  if (!loc) {
    return false
  }
  return loc.includes(q)
}

module.exports = {
  buildLocationSearchRegexp,
  matchesLocationSearch,
  normalizeLocationSearchText,
  parseSearchTokens,
}
