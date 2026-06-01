import {
  REGIONS,
  cityQueryFromRegion,
  formatLocationCity,
  getDistrict,
  mapCenterFromRegion,
} from './districts'
import { loadStoredRegion, saveBrowseRegion, type StoredRegion } from './regionBrowse'

export type RegionPageFields = {
  regionCityIndex: number
  regionDistrictIndex: number
  regionPickerRange: [string[], string[]]
  regionPickerValue: [number, number]
  regionLabel: string
  activeCityQuery: string
  mapLat: number
  mapLng: number
}

export function buildRegionPageFields(
  cityIndex: number,
  districtIndex: number
): RegionPageFields {
  const safeCityIndex =
    REGIONS.length > 0 ? Math.max(0, Math.min(cityIndex, REGIONS.length - 1)) : 0
  const maxD = REGIONS[safeCityIndex]?.districts.length ?? 1
  const safeDistrictIndex = Math.max(0, Math.min(districtIndex, maxD - 1))
  const city = REGIONS[safeCityIndex]?.city || REGIONS[0]?.city || '上海市'
  const d = getDistrict(safeCityIndex, safeDistrictIndex)
  const center = mapCenterFromRegion(safeCityIndex, safeDistrictIndex)
  return {
    regionCityIndex: safeCityIndex,
    regionDistrictIndex: safeDistrictIndex,
    regionPickerRange: [
      REGIONS.map((r) => r.city),
      REGIONS[safeCityIndex].districts.map((x) => x.name),
    ],
    regionPickerValue: [safeCityIndex, safeDistrictIndex],
    regionLabel: formatLocationCity(city, d.name),
    activeCityQuery: cityQueryFromRegion(safeCityIndex, safeDistrictIndex),
    mapLat: center.lat,
    mapLng: center.lng,
  }
}

export function initRegionFromStorage(): RegionPageFields {
  const stored = loadStoredRegion()
  return buildRegionPageFields(stored.cityIndex, stored.districtIndex)
}

export function onRegionColumnChange(
  column: number,
  value: number,
  currentCityIndex: number
): Partial<RegionPageFields> | null {
  if (column !== 0) {
    return null
  }
  const cityIndex = value
  return {
    regionCityIndex: cityIndex,
    regionDistrictIndex: 0,
    regionPickerRange: [
      REGIONS.map((r) => r.city),
      REGIONS[cityIndex].districts.map((x) => x.name),
    ],
    regionPickerValue: [cityIndex, 0],
  }
}

export function onRegionPickerChange(value: number[]): RegionPageFields {
  const cityIndex = value[0] ?? 0
  const districtIndex = value[1] ?? 0
  const fields = buildRegionPageFields(cityIndex, districtIndex)
  saveBrowseRegion({ cityIndex, districtIndex })
  return fields
}

/** 根据已保存的 location_city 反查市、区下标（编辑发布用） */
export function regionIndicesFromLocationCity(locationCity: string): {
  cityIndex: number
  districtIndex: number
} | null {
  const label = String(locationCity || '').trim()
  if (!label) {
    return null
  }
  for (let ci = 0; ci < REGIONS.length; ci++) {
    const city = REGIONS[ci]
    for (let di = 0; di < city.districts.length; di++) {
      if (formatLocationCity(city.city, city.districts[di].name) === label) {
        return { cityIndex: ci, districtIndex: di }
      }
    }
  }
  return null
}

export function getPublishRegion(
  cityIndex: number,
  districtIndex: number
): { cityDistrict: string; city: string; district: string } & StoredRegion {
  const city = REGIONS[cityIndex]?.city || REGIONS[0].city
  const d = getDistrict(cityIndex, districtIndex)
  return {
    cityIndex,
    districtIndex,
    city,
    district: d.name,
    cityDistrict: formatLocationCity(city, d.name),
  }
}
