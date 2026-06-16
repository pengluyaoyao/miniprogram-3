/**
 * MiniMax 小红书寄养宣传 — 结构化 Prompt
 * @see https://platform.minimaxi.com/docs/api-reference/api-overview
 */

const TEXT_SYSTEM_PROMPT = `你是一位资深小红书宠物内容运营，同时扮演「经验丰富、耐心细致的寄养家庭主人」。
你的任务是根据用户提供的寄养家庭结构化信息和上传的图片（如果有），生成适合小红书发布的宣传文案。

## 输出要求
- 必须只输出一个 JSON 对象，不要 Markdown 代码块，不要额外解释。
- 禁止输出思考过程、分析步骤或任何非 JSON 内容。
- JSON 必须严格合法：字符串内换行用 \\n 表示，禁止在 JSON 字符串里写真实换行；字符串内双引号须写成 \\"。
- JSON 字段：
  - title: string，标题，15～22 字，吸引毛孩子家长点击
  - body: string，正文，100 字，分段，可用 emoji，语气真诚、温暖、专业
  - hashtags: string[]，3～6 个小红书话题标签，每项以 # 开头
  - highlights: string[]，3 条卖点短句，每条 ≤16 字
  - coverImagePrompt: string，用于文生图的英文或中文画面描述（温馨寄养场景、无文字水印、无手机号微信号）
- 内容重点：安全、舒适、经验、耐心、环境干净、可信赖；让宠主放心。
- 禁止：虚构未提供的服务、夸大承诺、出现手机号/微信号/二维码/外链、攻击性或歧视性表述。
- 若信息不足，用委婉表述，不要编造具体数字。`

function buildTextUserPrompt(listing) {
  const lines = [
    '## 寄养家庭信息（用户填写）',
    `- 名称：${listing.displayName || '未填写'}`,
    `- 所在市区：${listing.locationCity || '未填写'}`,
    `- 服务经验（年）：${listing.yearsExperience ?? '未填写'}`,
    `- 可接收宠物：${formatList(listing.acceptPets)}`,
    `- 服务项目：${formatList(listing.serviceItems)}`,
    `- 其他服务：${listing.otherServices || '无'}`,
    `- 环境说明：${listing.envDescription || '见上传环境照片'}`,
    `- 价格说明：${listing.priceDescription || '价格线下沟通'}`,
    '',
    '请生成小红书宣传文案 JSON。',
  ]
  return lines.join('\n')
}

/** 文案 user 消息：有 imageUrls 时返回多模态 content 数组（text + image_url） */
function buildTextUserMessageContent(listing) {
  const text = buildTextUserPrompt(listing)
  const imageUrls = Array.isArray(listing.imageUrls)
    ? listing.imageUrls.map((u) => String(u || '').trim()).filter(Boolean)
    : []
  if (!imageUrls.length) {
    return text
  }
  const content = [{ type: 'text', text }]
  for (const url of imageUrls) {
    content.push({ type: 'image_url', image_url: { url, detail: 'low' } })
  }
  return content
}

const VISION_SYSTEM_PROMPT = `你是宠物寄养宣传图的视觉策划。用户会提供一张寄养环境或宠物相关照片。
请理解画面内容，并输出用于「在图上叠加可爱标签」的策划结果。

## 输出要求
- 只输出 JSON，不要 Markdown。
- 字段：
  - sceneSummary: string，一句话描述画面（中文）
  - tags: string[]，恰好 2 个，与养宠/寄养/温馨相关，每项 2～6 字，适合印在图上
  - decoratePrompt: string，给图像生成模型的中文 prompt：在保持原图场景与主体不变的前提下，叠加 2 个可爱圆角标签贴纸（字体圆润可爱、 pastel 配色），标签文字分别为 tags 中两项，整体温馨治愈、宠物寄养宣传风格，不要遮挡主体面部
- tags 示例方向：「温馨小窝」「耐心照护」「阳光陪伴」「安心寄养」等，需与画面内容相符。`

function buildVisionUserPrompt(listing, imageIndex) {
  return [
    `这是寄养家庭「${listing.displayName || '寄养家庭'}」的第 ${imageIndex + 1} 张宣传参考图。`,
    `所在市区：${listing.locationCity || '未填写'}。`,
    '请分析图片并输出 JSON（sceneSummary、tags、decoratePrompt）。',
  ].join('\n')
}

const T2I_FALLBACK_PROMPT_PREFIX =
  '温馨治愈的宠物家庭寄养宣传图，干净明亮的室内或庭院，宠物用品整齐，柔和自然光，小红书封面风格，无文字、无水印、无手机号，'

function buildT2IFallbackPrompt(coverImagePrompt) {
  return `${T2I_FALLBACK_PROMPT_PREFIX}${coverImagePrompt || '可爱狗狗在舒适垫子上休息'}`
}

function formatList(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join('、') || '未填写'
  }
  return String(value || '').trim() || '未填写'
}

function stripModelThinking(text) {
  let s = String(text || '')
  const thinkOpen = '<' + 'think>'
  const thinkClose = '<' + '/think>'
  // MiniMax M3 等模型可能返回 … 或 <think>…</think>
  s = s.replace(new RegExp(`${thinkOpen}[\\s\\S]*?${thinkClose}`, 'gi'), '')
  s = s.replace(/<think>[\s\S]*?<\/redacted_thinking>/gi, '')
  s = s.replace(/^\s*<think>[\s\S]*/i, '')
  return s.trim()
}

function repairModelJson(jsonStr) {
  let result = ''
  let inString = false
  let escaped = false
  for (let i = 0; i < jsonStr.length; i += 1) {
    const ch = jsonStr[i]
    if (inString) {
      if (escaped) {
        result += ch
        escaped = false
        continue
      }
      if (ch === '\\') {
        result += ch
        escaped = true
        continue
      }
      if (ch === '"') {
        inString = false
        result += ch
        continue
      }
      if (ch === '\n' || ch === '\r') {
        result += '\\n'
        continue
      }
      result += ch
      continue
    }
    if (ch === '"') {
      inString = true
    }
    result += ch
  }
  return result.replace(/,\s*([}\]])/g, '$1')
}

function parseStringField(block, key) {
  const marker = `"${key}"`
  const idx = block.indexOf(marker)
  if (idx < 0) {
    return ''
  }
  const colon = block.indexOf(':', idx + marker.length)
  if (colon < 0) {
    return ''
  }
  let i = block.indexOf('"', colon + 1)
  if (i < 0) {
    return ''
  }
  i += 1
  let out = ''
  while (i < block.length) {
    const ch = block[i]
    if (ch === '\\' && i + 1 < block.length) {
      const next = block[i + 1]
      if (next === 'n') {
        out += '\n'
      } else if (next === '"') {
        out += '"'
      } else if (next === '\\') {
        out += '\\'
      } else {
        out += next
      }
      i += 2
      continue
    }
    if (ch === '"') {
      break
    }
    if (ch === '\n' || ch === '\r') {
      out += '\n'
      i += 1
      continue
    }
    out += ch
    i += 1
  }
  return out.trim()
}

function parseArrayField(block, key) {
  const re = new RegExp(`"${key}"\\s*:\\s*(\\[[\\s\\S]*?\\])`)
  const m = block.match(re)
  if (!m) {
    return []
  }
  try {
    return JSON.parse(repairModelJson(m[1]))
  } catch (_err) {
    const items = []
    const strRe = /"((?:\\.|[^"\\])*)"/g
    let sm
    while ((sm = strRe.exec(m[1]))) {
      items.push(sm[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'))
    }
    return items
  }
}

function parseCopyFieldsFallback(jsonStr) {
  const title = parseStringField(jsonStr, 'title')
  const body = parseStringField(jsonStr, 'body')
  const coverImagePrompt = parseStringField(jsonStr, 'coverImagePrompt')
  const hashtags = parseArrayField(jsonStr, 'hashtags')
  const highlights = parseArrayField(jsonStr, 'highlights')
  if (!title && !body) {
    return null
  }
  return { title, body, hashtags, highlights, coverImagePrompt }
}

function parseJsonFromModelText(text) {
  const raw = stripModelThinking(text)
  if (!raw) {
    throw new Error('模型返回为空（可能仅有思考内容，未输出 JSON）')
  }
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1].trim() : raw
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end <= start) {
    throw new Error(`无法解析 JSON：${raw.slice(0, 200)}`)
  }
  const jsonSlice = candidate.slice(start, end + 1)
  try {
    return JSON.parse(jsonSlice)
  } catch (err1) {
    try {
      return JSON.parse(repairModelJson(jsonSlice))
    } catch (_err2) {
      const fallback = parseCopyFieldsFallback(jsonSlice)
      if (fallback) {
        return fallback
      }
      throw new Error(`JSON 格式错误：${err1.message} | 片段：${jsonSlice.slice(0, 200)}`)
    }
  }
}

module.exports = {
  TEXT_SYSTEM_PROMPT,
  buildTextUserPrompt,
  buildTextUserMessageContent,
  VISION_SYSTEM_PROMPT,
  buildVisionUserPrompt,
  buildT2IFallbackPrompt,
  stripModelThinking,
  parseJsonFromModelText,
}
