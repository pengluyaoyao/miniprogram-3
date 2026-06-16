#!/usr/bin/env node
/**
 * MiniMax 寄养家庭 → 小红书文案（本版仅文案；有 imageUrls 时图文同请求识图写文案）
 *
 * 用法：
 *   MINIMAX_API_KEY=你的key node scripts/minimax-xhs-copy/generate.js
 *   MINIMAX_API_KEY=你的key node scripts/minimax-xhs-copy/generate.js --input scripts/minimax-xhs-copy/sample-input.json
 *   MINIMAX_API_KEY=你的key node scripts/minimax-xhs-copy/generate.js --dry-run
 *
 * 文档：https://platform.minimaxi.com/docs/api-reference/api-overview
 */

/** 恢复识图/文生图/图生图时改为 true，并取消文件末尾「配图」段的注释 */
const ENABLE_IMAGE_GENERATION = false

const fs = require('fs')
const path = require('path')
const axios = require('axios')
const {
  TEXT_SYSTEM_PROMPT,
  buildTextUserPrompt,
  buildTextUserMessageContent,
  // VISION_SYSTEM_PROMPT,
  // buildVisionUserPrompt,
  // buildT2IFallbackPrompt,
  parseJsonFromModelText,
} = require('./prompts')

const DEFAULT_BASE = 'https://api.minimaxi.com'
const SAMPLE_PATH = path.join(__dirname, 'sample-input.json')

function parseArgs(argv) {
  const args = { input: SAMPLE_PATH, dryRun: false }
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--input' && argv[i + 1]) {
      args.input = path.resolve(argv[i + 1])
      i += 1
    } else if (a === '--dry-run') {
      args.dryRun = true
    } else if (a === '--help' || a === '-h') {
      console.log(`
MiniMax 小红书寄养宣传生成脚本

环境变量：
  MINIMAX_API_KEY      必填，在平台创建 https://platform.minimaxi.com/user-center/basic-information/interface-key
  MINIMAX_BASE_URL     可选，默认 ${DEFAULT_BASE}
  MINIMAX_TEXT_MODEL   可选，默认 MiniMax-M2.5
  MINIMAX_VISION_MODEL 可选，默认 MiniMax-M3（多模态识图）
  MINIMAX_IMAGE_MODEL  可选，默认 image-01

选项：
  --input <file>   输入 JSON（默认 sample-input.json）
  --dry-run        只打印 prompt，不请求 API

（配图：将 generate.js 顶部 ENABLE_IMAGE_GENERATION 设为 true 并取消配图代码注释）
`)
      process.exit(0)
    }
  }
  return args
}

function loadListing(inputPath) {
  const raw = fs.readFileSync(inputPath, 'utf8')
  const data = JSON.parse(raw)
  if (!data.displayName && !data.locationCity) {
    throw new Error('input JSON 至少需要 displayName 或 locationCity')
  }
  data.imageUrls = Array.isArray(data.imageUrls)
    ? data.imageUrls.map((u) => String(u || '').trim()).filter(Boolean)
    : []
  return data
}

function getConfig() {
  const apiKey = process.env.MINIMAX_API_KEY || ''
  if (!apiKey) {
    throw new Error('请设置环境变量 MINIMAX_API_KEY')
  }
  return {
    apiKey,
    baseUrl: (process.env.MINIMAX_BASE_URL || DEFAULT_BASE).replace(/\/$/, ''),
    textModel: process.env.MINIMAX_TEXT_MODEL || 'MiniMax-M2.5',
    visionModel: process.env.MINIMAX_VISION_MODEL || 'MiniMax-M3',
    imageModel: process.env.MINIMAX_IMAGE_MODEL || 'image-01',
  }
}

async function chatCompletion(cfg, { model, messages, maxTokens = 2048, disableThinking = false }) {
  const url = `${cfg.baseUrl}/v1/chat/completions`
  const body = {
    model,
    messages,
    max_completion_tokens: maxTokens,
    temperature: 0.85,
  }
  // MiniMax-M3 默认会输出思考内容，结构化 JSON 任务需关闭
  if (disableThinking) {
    body.thinking = { type: 'disabled' }
  }
  const res = await axios.post(
    url,
    body,
    {
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    }
  )
  const choice = res.data && res.data.choices && res.data.choices[0]
  const content = choice && choice.message && choice.message.content
  if (!content) {
    throw new Error(`文本 API 无 content：${JSON.stringify(res.data).slice(0, 500)}`)
  }
  return typeof content === 'string' ? content : JSON.stringify(content)
}

function logUserMessageContent(userContent) {
  console.log('\n—— 文案 User Prompt ——\n')
  if (typeof userContent === 'string') {
    console.log(userContent)
    return
  }
  const textPart = userContent.find((p) => p.type === 'text')
  if (textPart) console.log(textPart.text)
  userContent
    .filter((p) => p.type === 'image_url')
    .forEach((p, i) => {
      console.log(`\n[图片 ${i + 1}] ${p.image_url.url}`)
    })
}

async function generateCopy(cfg, listing) {
  const userContent = buildTextUserMessageContent(listing)
  const model = listing.imageUrls.length ? cfg.visionModel : cfg.textModel
  logUserMessageContent(userContent)

  const text = await chatCompletion(cfg, {
    model,
    messages: [
      { role: 'system', content: TEXT_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    maxTokens: listing.imageUrls.length ? 4096 : 2048,
    disableThinking: /m3/i.test(model),
  })
  const copy = parseJsonFromModelText(text)
  const userPrompt =
    typeof userContent === 'string'
      ? userContent
      : userContent.find((p) => p.type === 'text')?.text || ''
  return { raw: text, copy, userPrompt, model }
}

/* —— 配图（本版关闭；恢复时将 ENABLE_IMAGE_GENERATION 设为 true 并取消本段注释）——
async function analyzeImageForTags(cfg, listing, imageUrl, index) {
  const userText = buildVisionUserPrompt(listing, index)
  const text = await chatCompletion(cfg, {
    model: cfg.visionModel,
    messages: [
      { role: 'system', content: VISION_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
        ],
      },
    ],
    maxTokens: 1024,
  })
  const vision = parseJsonFromModelText(text)
  return { raw: text, vision, userText, sourceUrl: imageUrl }
}

async function generateImage(cfg, { prompt, subjectImageUrl, aspectRatio = '3:4' }) {
  const url = `${cfg.baseUrl}/v1/image_generation`
  const body = {
    model: cfg.imageModel,
    prompt,
    aspect_ratio: aspectRatio,
    response_format: 'url',
    n: 1,
    prompt_optimizer: true,
    aigc_watermark: false,
  }
  if (subjectImageUrl) {
    body.subject_reference = [{ type: 'character', image_file: subjectImageUrl }]
  }

  const res = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 180000,
  })

  const data = res.data || {}
  const code = data.base_resp && data.base_resp.status_code
  if (code !== 0 && code !== undefined) {
    throw new Error(
      `图像 API 失败 status_code=${code} msg=${(data.base_resp && data.base_resp.status_msg) || ''}`
    )
  }
  const urls = (data.data && data.data.image_urls) || []
  if (!urls.length) {
    throw new Error(`图像 API 未返回 URL：${JSON.stringify(data).slice(0, 500)}`)
  }
  return { taskId: data.id, imageUrl: urls[0], request: body }
}

async function generateImages(cfg, listing, copy, imageUrls, options = {}) {
  const results = []

  if (imageUrls.length) {
    for (let i = 0; i < imageUrls.length; i += 1) {
      const src = imageUrls[i]
      console.log(`\n[图片 ${i + 1}/${imageUrls.length}] 识图 + 标签装饰…`)
      const { vision } = await analyzeImageForTags(cfg, listing, src, i)
      console.log('  场景：', vision.sceneSummary)
      console.log('  标签：', vision.tags && vision.tags.join(' · '))

      const decoratePrompt =
        vision.decoratePrompt ||
        `温馨宠物寄养宣传图，画面：${vision.sceneSummary || '舒适寄养环境'}，叠加 2 个可爱圆角标签贴纸，文字分别为「${(vision.tags || [])[0] || '温馨小窝'}」「${(vision.tags || [])[1] || '安心寄养'}」，字体圆润可爱、 pastel 配色，治愈风`

      const img = await generateImage(cfg, {
        prompt: decoratePrompt,
        subjectImageUrl: options.useI2i ? src : undefined,
        aspectRatio: '3:4',
      })
      results.push({
        type: 'decorated',
        sourceUrl: src,
        tags: vision.tags,
        sceneSummary: vision.sceneSummary,
        outputUrl: img.imageUrl,
        decoratePrompt,
      })
    }
    return results
  }

  console.log('\n[无参考图] 文生图生成封面…')
  const prompt = buildT2IFallbackPrompt(copy.coverImagePrompt)
  const img = await generateImage(cfg, { prompt, aspectRatio: '3:4' })
  results.push({
    type: 'text_to_image',
    outputUrl: img.imageUrl,
    prompt,
  })
  return results
}
—— 配图结束 —— */

function printCopyResult(copy) {
  console.log('\n========== 小红书文案 ==========')
  console.log('标题：', copy.title)
  console.log('\n正文：\n', copy.body)
  console.log('\n话题：', (copy.hashtags || []).join(' '))
  console.log('\n卖点：', (copy.highlights || []).join(' | '))
  if (copy.coverImagePrompt) {
    console.log('\n封面图描述：', copy.coverImagePrompt)
  }
}

async function main() {
  const args = parseArgs(process.argv)
  const listing = loadListing(args.input)

  console.log('输入文件：', args.input)
  console.log('寄养家庭：', listing.displayName)

  if (args.dryRun) {
    console.log('\n[dry-run] 仅展示 Prompt，不请求 API')
    console.log('\n—— System（文案）——\n', TEXT_SYSTEM_PROMPT)
    const userContent = buildTextUserMessageContent(listing)
    const model = listing.imageUrls.length ? '(有图 → MiniMax-M3)' : '(纯文本 → MiniMax-M2.5)'
    console.log('\n—— User', model, '——')
    logUserMessageContent(userContent)
    return
  }

  const cfg = getConfig()
  const copyModel = listing.imageUrls.length ? cfg.visionModel : cfg.textModel
  console.log(
    '模型：',
    copyModel,
    listing.imageUrls.length ? `（图文 ${listing.imageUrls.length} 张）` : '（仅文本）',
    ENABLE_IMAGE_GENERATION ? ` / ${cfg.imageModel}` : ''
  )

  const t0 = Date.now()
  const { copy } = await generateCopy(cfg, listing)
  printCopyResult(copy)

  const images = []
  /* 配图（恢复时取消注释，并设 ENABLE_IMAGE_GENERATION = true）
  if (ENABLE_IMAGE_GENERATION) {
    images = await generateImages(cfg, listing, copy, listing.imageUrls, {
      useI2i: args.useI2i,
    })
    console.log('\n========== 生成图片 ==========')
    images.forEach((item, i) => {
      console.log(`\n[${i + 1}] ${item.type}`)
      if (item.sourceUrl) console.log('  原图：', item.sourceUrl)
      if (item.tags) console.log('  标签：', item.tags.join(' · '))
      console.log('  输出：', item.outputUrl)
    })
  }
  */

  const outPath = path.join(
    __dirname,
    `output-${Date.now()}.json`
  )
  const output = {
    generatedAt: new Date().toISOString(),
    listing,
    copy,
    images,
    elapsedMs: Date.now() - t0,
  }
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8')
  console.log(`\n完整结果已写入：${outPath}`)
  console.log(`总耗时：${((Date.now() - t0) / 1000).toFixed(1)}s`)
}

main().catch((err) => {
  const msg = err.response
    ? `${err.message} | ${JSON.stringify(err.response.data).slice(0, 800)}`
    : err.message
  console.error('\n❌', msg)
  process.exit(1)
})
