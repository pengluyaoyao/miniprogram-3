# 云函数说明与故障排查

## 本目录函数

| 目录名（= 调用 `name`） | 作用 |
|------------------------|------|
| `initDatabase` | 创建 PRD 第八节 10 个数据库集合 |
| `upsertUser` | 登录时按 OPENID 写入/更新 `users` |
| `publishListing` | 发布页提交：写入 `provider_profiles` 或 `boarding_requests`；寄养家庭可附带 `xhsCopy` 写入 `xhs_title` / `xhs_body` / `xhs_hashtags` / `xhs_highlights` 供详情页展示 |
| `generateXhsCopy` | 寄养家庭新建发布：内容安全检测通过后调用 MiniMax 生成小红书文案，返回预览数据（不写入库） |
| `getPublishedFeed` | 首页：无 `cityQuery` → 寄养家庭/宠主需求各最多 50 条；有 `cityQuery` → 按 `location_city` 子串筛选。均不按距离排序，返回 `distance_label` 为市区文案（`lat`/`lng` 仍写入库供后续扩展） |
| `getListingDetail` | 详情页：按 `id` + `listingType` 拉取单条已发布记录 |
| `getMyBoardingRequests` | 当前用户宠主需求（旧，可由 `getMyPublications` 替代） |
| `getMyPublications` | 「我的发布」：当前用户全部 `boarding_requests` + `provider_profiles` |
| `getMyListingForEdit` | 编辑前拉取本人单条发布 |
| `deleteMyListing` | 下架本人发布（`status: hidden`） |
| `getMyFavorites` | 「我的收藏」：当前用户 `favorites` |
| `addFavorite` | 详情页收藏：写入 `favorites`（同条去重） |
| `getMyReports` | 「举报记录」：当前用户 `reports` |
| `submitReport` | 举报页：写入 `reports` |
| `submitFeedback` | 「联系我们」：写入 `platform_feedback`，可选订阅消息通知管理员 |
| `chatSend` | 发送站内留言；可选配置订阅消息通知对方 |
| `chatLoad` | 按 `listingId` 或 `threadId` 加载会话与历史消息 |
| `chatInbox` | 当前用户的会话列表 + `unreadTotal` |
| `chatMarkRead` | 将会话未读数清零 |
| `mediaCheckCallback` | 接收微信「多媒体安全」异步检测结果（需配置消息推送） |

`wx.cloud.callFunction` 里的 **`name` 必须与文件夹名完全一致**（区分大小写）。

## 发布内容安全（`publishListing` / `generateXhsCopy`）

- **文本**：提交前 `security.msgSecCheck`（v2）同步检测，不通过返回 `内容含有违规信息，请修改后重试`，不入库。
- **图片**：`security.mediaCheckAsync` 异步检测；结果写入集合 `sec_media_checks`（需 `initDatabase` 建表）。云函数轮询约 **28s**；超时或未配置推送时对单张图走 `imgSecCheck` 同步兜底。
- **上传压缩**：发布页选图后先用 `wx.compressImage` 压到约 **800KB** 再上传云存储，避免同步兜底触发微信 **1MB** 上限。
- **未通过**：删除本次提交涉及的云存储图片 fileID，不写入 `provider_profiles` / `boarding_requests`。
- 部署：更新 **`publishListing`**、**`generateXhsCopy`**、**`mediaCheckCallback`**，重新执行 `initDatabase`。

### `mediaCheckCallback` + 消息推送（必配，减少同步兜底）

异步图片检测依赖微信把 `wxa_media_check` 结果推到云函数，否则只能等超时后走同步 `imgSecCheck`（更慢、更严）。

1. **部署云函数**  
   开发者工具 → `cloudfunctions/mediaCheckCallback` → 右键 **上传并部署：云端安装依赖**。

2. **微信公众平台配置消息推送**  
   - 登录 [微信公众平台](https://mp.weixin.qq.com/) → **开发** → **开发管理** → **消息推送**（或「开发设置」里相关入口）  
   - 启用消息推送，**消息类型** 需能接收服务器事件  
   - **云开发环境**：选择与 `miniprogram/constants/cloudEnv.ts` 中 `CLOUD_ENV_ID` 一致的环境  
   - **云函数**：选择 **`mediaCheckCallback`**  
   - 保存后可用测试图发布一次，在数据库 **`sec_media_checks`** 查看对应 `trace_id` 是否在数秒内出现 `suggest: pass` / `review` 且 `done: true`

3. **验收**  
   - 发布带图信息时，云函数日志不应频繁出现 `mediaCheckAsync timeout, sync fallback`  
   - 若 `suggest` 为空，代码会对该张图单独走同步兜底，不再直接判失败

## `generateXhsCopy`（寄养家庭文案生成）

- **触发**：发布页寄养家庭角色、新建（非编辑）点「生成文案并发布信息」→ 本函数先做与 `publishListing` 相同的内容安全检测，通过后调用 MiniMax 生成小红书文案 JSON，**不入库**。
- **预览页**：小程序跳转 `pages/publish-preview/publish-preview`，用户点「确认发布信息」再调 `publishListing` 写入 `provider_profiles`。
- **环境变量**（云开发控制台 → 云函数 → `generateXhsCopy` → 配置）：
  - `MINIMAX_API_KEY`（必填）
  - `MINIMAX_BASE_URL` 可选，默认 `https://api.minimaxi.com`
  - `MINIMAX_TEXT_MODEL` 默认 `MiniMax-M2.5`（无环境图时）
  - `MINIMAX_VISION_MODEL` 默认 `MiniMax-M3`（有环境图时图文识图）
- **部署**：右键 `generateXhsCopy` → **上传并部署：云端安装依赖**（含 `axios`），超时已设 60s。本函数目录内自带 `districtCenters.js` / `contentSecurity.js` / `regions.json` 副本（与 `publishListing` 同步维护，勿引用兄弟目录）。
- **若日志出现 `timed out after 3 seconds`**：说明云端执行超时仍为默认 3s。请在 **云开发控制台 → 云函数 → generateXhsCopy → 函数配置** 将超时改为 **60 秒** 并保存，然后重新上传部署；小程序端已对 `generateXhsCopy` / 确认发布使用 `callFunction({ slow: true })`。

## `errCode: 50010` / `FunctionName parameter could not be found`

表示**当前云环境里找不到该云函数**，常见原因：

1. **未上传部署**  
   在微信开发者工具左侧展开 `cloudfunctions`，对下列函数右键 → **上传并部署：云端安装依赖**（有 `package.json` 时）：  
   `upsertUser` / `initDatabase` / `publishListing` / `generateXhsCopy` / `mediaCheckCallback` / `getPublishedFeed` / `getListingDetail` / `getMyPublications` / `getMyListingForEdit` / `deleteMyListing` / `getMyFavorites` / `addFavorite` / `getMyReports` / `submitReport` / `submitFeedback` / `chatSend` / `chatLoad` / `chatInbox` / `chatMarkRead`。

2. **环境与代码不一致**  
   小程序 `miniprogram/constants/cloudEnv.ts` 中的 `CLOUD_ENV_ID` 必须与开发者工具里云开发所选环境一致；`callFunction` 已显式传入 `config: { env: CLOUD_ENV_ID }`。

3. **项目根目录错误**  
   应用 **仓库根目录** 打开项目（含 `project.config.json` 与 `cloudfunctions/`），不要只打开 `miniprogram/` 子目录，否则工具可能识别不到云函数根目录。

4. **函数名拼写**  
   代码中必须为 `upsertUser`、`initDatabase`、`publishListing`、`getPublishedFeed`、`getListingDetail`、`getMyBoardingRequests`、`getMyFavorites`、`addFavorite`、`getMyReports`、`submitReport`、`chatSend`、`chatLoad`、`chatInbox`、`chatMarkRead`，不能写成 `UpsertUser` 等。

部署成功后，在 **云开发控制台 → 云函数** 列表中应能看到同名函数。

## 站内留言与订阅消息

- 数据库集合：`chat_threads`（会话）、`chat_messages`（消息）。首次使用请重新执行 `initDatabase`（`confirm: INIT_DB_V1`）或在控制台手动建集合。
- 小程序内 **一次性订阅授权**：模板 ID 见 `miniprogram/constants/subscribeMessage.ts`；仅在用户**首次**点「提交发布」或「发站内留言」且未在设置中选过接受/拒绝时弹窗一次，不会每次操作都弹。
- **微信里「收到新消息」服务通知**（订阅消息卡片）需同时满足：
  1. 公众平台已启用模板 `9JxH1WSbK_o3VkWScncrkAQIYFxYFGijFnet30TaIR8`（或与代码中 ID 一致）。
  2. 重新 **上传并部署** 云函数 `chatSend`（默认使用该模板 ID；可选环境变量 **`SUBSCRIBE_TMPL_NEW_MSG`** 覆盖）。
  3. 体验版/开发版推送可将 `chatSend` 环境变量 **`SUBSCRIBE_MINIPROGRAM_STATE`** 设为 `developer` 或 `trial`（默认 `formal` 正式版）。
  3. 修改 `cloudfunctions/chatSend/index.js` 中 `cloud.openapi.subscribeMessage.send` 的 **`data` 内 key**（如 `thing1` / `time2`）与模板字段 **一一对应**，`value` 长度符合模板限制；与默认示例不一致时必须改代码。
  4. **接收方**曾在小程序里对该模板点过 **「允许」**；若点「拒绝」或从不弹窗，则只会收到站内信，**不会**收到服务通知。
  5. 未配置 `SUBSCRIBE_TMPL_NEW_MSG`、或发送失败（字段不匹配、额度等）时，**不影响**站内留言写入数据库；可在云开发 → 云函数 → 日志里查看 `[chatSend] subscribeMessage` 报错。

未读角标：小程序从后台回到前台时会执行 `App.onShow` 拉取未读数；发信成功约 200ms 后会再次拉取并刷新各页「我的」角标。

## 「联系我们」与用户反馈（`submitFeedback`）

- **入口**：「我的」→ **联系我们**（未登录也可进入留言页）。
- **数据**：集合 **`platform_feedback`**（需 `initDatabase` 或控制台手动建表）。
- **部署**：上传并部署云函数 **`submitFeedback`**（含 `msgSecCheck`、可选 `subscribeMessage.send` 权限）。

### 在微信收到用户反馈通知

1. 用你的微信打开小程序并 **登录一次**，在云开发数据库 **`users`** 或云函数日志里找到你的 **`OPENID`**（或从「我的」页 ID 尾号对照确认完整 openid）。
2. 云开发控制台 → 云函数 **`submitFeedback`** → **配置** → 环境变量：
   - **`ADMIN_OPENID`** = 你的 openid（必填，否则只入库不推送）
   - 可选 **`SUBSCRIBE_TMPL_FEEDBACK`**：订阅消息模板 ID（默认与站内新留言模板相同）
   - 可选 **`SUBSCRIBE_MINIPROGRAM_STATE`**：`developer` / `trial` / `formal`（体验版调试时用 `developer`）
3. 在公众平台启用订阅消息模板（可与 `chatSend` 共用 `9JxH1WSbK_o3VkWScncrkAQIYFxYFGijFnet30TaIR8`，字段需与代码中 `thing1` / `thing4` / `time3` / `thing6` 一致）。
4. **管理员账号**需在小程序里至少 **授权过一次**该订阅模板（例如在发布/留言流程里点「允许」），否则服务通知发不成功；失败不影响留言入库。
5. 在控制台 **数据库 → platform_feedback** 查看全部留言（含手机号/微信号）。
