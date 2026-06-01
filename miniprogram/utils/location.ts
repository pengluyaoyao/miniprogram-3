/**
 * 粗略网格：降低精确门牌级暴露，兼顾地图展示与隐私。
 * 约 0.002° ≈ 200m（纬度方向）。
 */
export const LOCATION_GRID_STEP = 0.002

export function quantizeLocationRough(lat: number, lng: number): { lat: number; lng: number } {
  const s = LOCATION_GRID_STEP
  return {
    lat: Math.round(lat / s) * s,
    lng: Math.round(lng / s) * s,
  }
}
