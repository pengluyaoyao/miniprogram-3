import { CLOUD_ENV_ID } from '../constants/cloudEnv'

export function callCloud(
  name: string,
  data?: Record<string, unknown>
): Promise<WechatMiniprogram.ICloud.CallFunctionResult> {
  return wx.cloud.callFunction({
    name,
    config: { env: CLOUD_ENV_ID },
    data: data || {},
  })
}
