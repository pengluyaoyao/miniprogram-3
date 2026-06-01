import { DEFAULT_REGION, REGIONS } from './districts'

const STORAGE_KEY = 'browse_region_v1'

export type StoredRegion = { cityIndex: number; districtIndex: number }

function clampStored(region: StoredRegion): StoredRegion {
  if (!REGIONS.length) {
    return { ...DEFAULT_REGION }
  }
  const cityIndex = Math.max(0, Math.min(region.cityIndex, REGIONS.length - 1))
  const maxDistrict = REGIONS[cityIndex].districts.length - 1
  const districtIndex = Math.max(0, Math.min(region.districtIndex, maxDistrict))
  return { cityIndex, districtIndex }
}

export function loadStoredRegion(): StoredRegion {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY) as StoredRegion | ''
    if (
      raw &&
      typeof raw === 'object' &&
      typeof raw.cityIndex === 'number' &&
      typeof raw.districtIndex === 'number'
    ) {
      return clampStored(raw)
    }
  } catch {
    /* ignore */
  }
  return clampStored({ ...DEFAULT_REGION })
}

export function saveBrowseRegion(region: StoredRegion): void {
  try {
    wx.setStorageSync(STORAGE_KEY, region)
  } catch {
    /* ignore */
  }
}
