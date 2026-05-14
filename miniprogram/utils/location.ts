/**
 * 非高精度定位 + 粗略网格：降低精确门牌级暴露，兼顾列表/地图展示与隐私。
 * 约 0.002° ≈ 200m（纬度方向；经度随纬度略变，量级一致）。
 */
export const LOCATION_GRID_STEP = 0.002

export function quantizeLocationRough(lat: number, lng: number): { lat: number; lng: number } {
  const s = LOCATION_GRID_STEP
  return {
    lat: Math.round(lat / s) * s,
    lng: Math.round(lng / s) * s,
  }
}

/** 微信 getLocation：关闭高精度 GPS，仍走系统定位权限 */
export function getLocationCoarse(
  options: Omit<
    WechatMiniprogram.GetLocationOption,
    'type' | 'isHighAccuracy' | 'success' | 'fail' | 'complete'
  > = {}
): Promise<WechatMiniprogram.GetLocationSuccessCallbackResult> {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      ...options,
      type: 'gcj02',
      isHighAccuracy: false,
      success: resolve,
      fail: reject,
    })
  })
}
