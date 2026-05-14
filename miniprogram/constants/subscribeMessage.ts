/**
 * 在微信公众平台申请「订阅消息」模板后，将模板 ID 填到下方数组（最多 3 个）。
 * 用户点击「发站内留言」时会调起授权；留空则跳过授权，仅使用站内信。
 *
 * 服务端发送需在云函数环境变量配置 SUBSCRIBE_TMPL_NEW_MSG，且模板字段需与
 * cloudfunctions/chatSend 中 data 的 key 一致（默认可用 thing1 / thing2 / time3）。
 */
export const SUBSCRIBE_MESSAGE_TEMPLATE_IDS: string[] = []
