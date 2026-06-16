import { CLOUD_ENV_ID } from '../constants/cloudEnv'

export type CallCloudOptions = {
  /** 长耗时云函数（如 MiniMax 文案、图片安全检测），避免 3s 调用超时 */
  slow?: boolean
}

export function callCloud(
  name: string,
  data?: Record<string, unknown>,
  options?: CallCloudOptions
): Promise<WechatMiniprogram.ICloud.CallFunctionResult> {
  return wx.cloud.callFunction({
    name,
    config: { env: CLOUD_ENV_ID },
    data: data || {},
    ...(options?.slow ? { slow: true } : {}),
  })
}
