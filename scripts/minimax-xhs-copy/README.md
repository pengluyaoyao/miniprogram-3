# MiniMax 小红书寄养宣传脚本

根据用户填写的寄养家庭信息，调用 [MiniMax 开放平台](https://platform.minimaxi.com/docs/api-reference/api-overview) 生成：

1. **小红书风格宣传文案**（`POST /v1/chat/completions`）— **当前默认仅此项**；有 `imageUrls` 时同一次请求图文输入，仍只输出文本 JSON
2. ~~宣传配图~~（图像生成，已在 `generate.js` 中注释关闭；恢复见文件内 `ENABLE_IMAGE_GENERATION`）

## 前置条件

1. 在 [接口密钥](https://platform.minimaxi.com/user-center/basic-information/interface-key) 创建 **API Key**（按量付费）
2. 账户有余额
3. 本机已 `npm install`（项目根目录已有 `axios`）

## 快速测试

```bash
# 仅查看 prompt，不消耗额度
node scripts/minimax-xhs-copy/generate.js --dry-run

# 生成文案（默认，不调图像 API）
export MINIMAX_API_KEY='你的key'
node scripts/minimax-xhs-copy/generate.js

# 自定义输入
export MINIMAX_API_KEY='你的key'
node scripts/minimax-xhs-copy/generate.js --input scripts/minimax-xhs-copy/sample-input.json
```

成功后在 `scripts/minimax-xhs-copy/output-*.json` 查看完整 JSON 结果。

## 输入 JSON 格式

见 `sample-input.json`：

| 字段 | 说明 |
|------|------|
| displayName | 寄养家庭名称 |
| locationCity | 所在市区 |
| yearsExperience | 经验年数 |
| acceptPets | 可接宠物，数组或字符串 |
| serviceItems | 服务项目 |
| otherServices | 其他服务 |
| envDescription | 环境说明 |
| priceDescription | 价格说明 |
| imageUrls | 可选，公网可访问的图片 URL 列表；有图时自动用 `MiniMax-M3` 多模态识图写文案 |

`imageUrls` 需为 **HTTPS 公网直链**（云存储 `cloud://` 需先换临时链）。百度图片搜索页等跳转链接模型可能无法识图；sample 使用你提供的百度详情页 URL 做测试。

## 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| MINIMAX_API_KEY | （必填） | Bearer Token |
| MINIMAX_BASE_URL | `https://api.minimaxi.com` | 国内站；海外可用 `https://api.minimax.io` |
| MINIMAX_TEXT_MODEL | `MiniMax-M2.5` | 无 `imageUrls` 时的纯文本文案 |
| MINIMAX_VISION_MODEL | `MiniMax-M3` | 有 `imageUrls` 时图文同请求写文案（`image_url`） |
| MINIMAX_IMAGE_MODEL | `image-01` | 文生图 / 图生图 |

## API 对应关系

| 步骤 | 接口 | 文档 |
|------|------|------|
| 文案（纯文本） | `POST /v1/chat/completions`，M2.5 | [OpenAI 兼容](https://platform.minimaxi.com/docs/api-reference/text-openai-api) |
| 文案（图文） | 同上，M3 + messages 含 `image_url` | [Chat Completions](https://platform.minimaxi.com/docs/api-reference/text-chat-openai) |
| 配图 | `POST /v1/image_generation` | [文生图](https://platform.minimaxi.com/docs/api-reference/image-generation-t2i) / [图生图](https://platform.minimaxi.com/docs/api-reference/image-generation-i2i) |

## 注意

- **勿将 API Key 提交到 Git**，只用环境变量
- 生成图片 URL 有效期约 **24 小时**，请及时下载
- 图生图 `subject_reference` 对参考图要求较高；宠物/环境照效果因图而异
- 接入小程序时需放云函数，并做内容安全检测（与 `publishListing` 一致）
