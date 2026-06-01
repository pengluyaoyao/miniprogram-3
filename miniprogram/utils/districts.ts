import { REGIONS_DATA } from '../data/regionsData'
import type { CityRegion, DistrictDef } from './districts-types'

export type { CityRegion, DistrictDef } from './districts-types'

export const REGIONS: CityRegion[] = REGIONS_DATA

/** 默认：上海市浦东新区 */
export const DEFAULT_REGION = { cityIndex: 0, districtIndex: 10 }

export function formatLocationCity(city: string, district: string): string {
  if (city === '其他') {
    return district || '其他地区'
  }
  return `${city}${district}`
}

export function getDistrict(cityIndex: number, districtIndex: number): DistrictDef {
  const city = REGIONS[cityIndex] || REGIONS[0]
  const list = city.districts
  const idx = Math.max(0, Math.min(districtIndex, list.length - 1))
  return list[idx]
}

export function cityQueryFromRegion(cityIndex: number, districtIndex: number): string {
  return getDistrict(cityIndex, districtIndex).name
}

export function cityQueryFromRegionFull(cityIndex: number, districtIndex: number): string {
  const city = REGIONS[cityIndex]?.city || REGIONS[0].city
  const district = getDistrict(cityIndex, districtIndex).name
  return district === '其他市区' ? city : district
}

export function mapCenterFromRegion(cityIndex: number, districtIndex: number): {
  lat: number
  lng: number
} {
  const d = getDistrict(cityIndex, districtIndex)
  return { lat: d.lat, lng: d.lng }
}

export type MapCenterResult = { lat: number; lng: number; scale: number }

export type MapPoint = { latitude: number; longitude: number }

function normalizeRegionText(s: string): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s/g, '')
}

/** 搜索词匹配到整座城市（如「北京」「浦东新区」→ 上海市） */
export function matchCityRegionFromQuery(query: string): CityRegion | null {
  const q = normalizeRegionText(query)
  if (!q) {
    return null
  }

  for (const region of REGIONS) {
    const cityNorm = normalizeRegionText(region.city)
    const cityShort = cityNorm.replace(/市$/, '')
    if (q === cityNorm || q === cityShort) {
      return region
    }
    if (
      cityShort.length >= 2 &&
      (q.includes(cityShort) || cityShort.includes(q))
    ) {
      return region
    }
  }

  for (const region of REGIONS) {
    for (const d of region.districts) {
      const distNorm = normalizeRegionText(d.name)
      const distShort = distNorm.replace(/(新区|街道|区|县|市)$/g, '')
      if (
        q === distNorm ||
        distNorm.includes(q) ||
        (distShort.length >= 2 && (q.includes(distShort) || distShort.includes(q)))
      ) {
        return region
      }
    }
  }

  return null
}

/** 用于 include-points：覆盖整座城市各区的示意点 */
export function cityMapPointsFromRegion(region: CityRegion): MapPoint[] {
  return region.districts.map((d) => ({
    latitude: d.lat,
    longitude: d.lng,
  }))
}

export function cityMapPointsFromQuery(query: string): MapPoint[] | null {
  const region = matchCityRegionFromQuery(query)
  if (!region) {
    return null
  }
  return cityMapPointsFromRegion(region)
}

/** 根据 location_city 解析标点（优先区中心，避免旧数据默认上海坐标） */
export function resolveDocMapPosition(doc: {
  location_city?: unknown
  lat?: unknown
  lng?: unknown
}): { lat: number; lng: number } | null {
  const loc = String(doc.location_city || '').trim()
  if (loc) {
    let bestLen = 0
    let best: { lat: number; lng: number } | null = null
    for (const region of REGIONS) {
      for (const d of region.districts) {
        const full = `${region.city}${d.name}`
        if (loc.includes(full) || loc.includes(d.name)) {
          const len = full.length
          if (len > bestLen) {
            bestLen = len
            best = { lat: d.lat, lng: d.lng }
          }
        }
      }
    }
    if (best) {
      return best
    }
  }
  const lat = typeof doc.lat === 'number' ? doc.lat : Number(doc.lat)
  const lng = typeof doc.lng === 'number' ? doc.lng : Number(doc.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng }
  }
  return null
}

/** 城市级地图中心（scale 越小视野越大，约 10 为整市） */
export function mapCenterFromCityQuery(query: string): MapCenterResult | null {
  const region = matchCityRegionFromQuery(query)
  if (!region || !region.districts.length) {
    return null
  }
  const ds = region.districts
  const lat = ds.reduce((sum, x) => sum + x.lat, 0) / ds.length
  const lng = ds.reduce((sum, x) => sum + x.lng, 0) / ds.length
  return { lat, lng, scale: 10 }
}
