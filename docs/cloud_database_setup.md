# 云数据库集合初始化（PRD 第八节）

## 云数据库 vs 云存储

| 能力 | 用途 |
|------|------|
| **云数据库** | `users`、`pets`、`boarding_requests` 等结构化数据（本文档） |
| **云存储** | 头像、宠物照、环境照等文件（`avatar_url`、`photos` 等字段存 fileID 或 HTTPS 链接） |

PRD 第八节描述的是**表/集合结构**，对应在云开发里建 **数据库集合**，不要建在「云存储」文件列表里。

## 集合列表（与 PRD 8.1～8.10 对应）

| 集合名 | PRD 章节 |
|--------|----------|
| `users` | 8.1 用户表 |
| `pets` | 8.2 宠物表 |
| `boarding_requests` | 8.3 宠主寄养需求表 |
| `provider_profiles` | 8.4 寄养家庭资料表 |
| `contact_logs` | 8.5 联系行为记录表 |
| `profile_view_logs` | 8.6 完整信息查看记录表 |
| `view_entitlements` | 8.7 信息查看权益表 |
| `payment_orders` | 8.8 平台权益支付订单表 |
| `favorites` | 8.9 收藏表 |
| `reports` | 8.10 举报表 |

## 方式 A：云函数自动建集合（推荐）

项目已提供云函数 `cloudfunctions/initDatabase`：

1. 确认 `miniprogram/app.ts` 中已 `wx.cloud.init({ env: 'cloud1-d0gv4gw6oac358372' })`，且开发者工具已绑定同一环境。
2. 在 `cloudfunctions/initDatabase` 目录执行：`npm install`。
3. 在微信开发者工具中，右键 `initDatabase` → **上传并部署：云端安装依赖**。
4. **必须再执行一次云函数**（仅上传部署不会建集合）：
   - **推荐**：小程序内打开页面 `pages/db-init/db-init`（已加入 `app.json`）  
     → 微信开发者工具顶部 **编译** 旁下拉 → **添加编译模式** → 启动页面选 **db-init** → 编译后点按钮「执行初始化」。
   - 或在 **微信开发者工具** 左侧 **云开发** → **云函数** → `initDatabase` → **云端测试**  
     测试参数（JSON）务必包含：
     ```json
     { "confirm": "INIT_DB_V1" }
     ```
     若控制台只让填「字符串」，需能解析为上述 JSON 对象（不同版本界面略有差异）。
   - 或在控制台输入 `wx.cloud.callFunction({ name: 'initDatabase', data: { confirm: 'INIT_DB_V1' } })`（若支持）。

成功后，在 **微信开发者工具 → 云开发 → 数据库** 中应能看到上述 10 个集合；每个集合内有一条固定文档 `_id` 为 `prd_section8_meta`（可日后删除，删除后若集合无其它文档，部分界面可能不再显示该集合）。

### 若报错 `DATABASE_COLLECTION_NOT_EXIST` / `-502005`

说明当前环境**不允许**在「集合不存在」时直接 `set` 文档。云函数已改为先用 **`@cloudbase/node-sdk` 的 `createCollection`** 建集合，再写入元数据。请 **重新上传并部署 `initDatabase`（云端安装依赖）** 后，再在 `db-init` 页执行一次。

若 `createCollection` 仍失败，请到 **云开发控制台 → 数据库 → 添加集合**，手动创建与上文同名的集合后，再执行初始化（此时 `createCollection` 会跳过已存在集合，仅写入元数据）。

### 若 CloudBase 网页控制台仍看不到

- 微信云开发的数据库主要在 **开发者工具内「云开发」面板** 查看；独立打开的 **腾讯云 CloudBase 控制台** 需登录 **同一账号、同一环境 ID**（如 `cloud1-d0gv4gw6oac358372`），环境不一致会看不到集合。
- 确认 `app.ts` 里 `wx.cloud.init` 的 `env` 与当前工具右上角所选环境一致。

## 方式 B：控制台手动添加集合

在云开发控制台 → **数据库** → **添加集合**，依次新建与上表同名的集合即可。无需预先定义字段（云数据库为文档型，字段随写入文档变化）。

## 文档 ID 说明

- 云数据库默认使用字段 **`_id`** 作为文档主键（自动生成）。
- PRD 示例里的业务字段 **`id`**（如 `user_001`）可作为普通字段自行写入，与 `_id` 并存；或在业务层只用 `_id` 统一引用。

## 登录写入 users

云函数 **`upsertUser`**：在小程序内 `wx.getUserProfile` 后 `wx.cloud.callFunction({ name: 'upsertUser', data: { nickName, avatarUrl, ... } })`，服务端用 `cloud.getWXContext()` 取 **OPENID / UNIONID**，合并后写入 **`users`**（无则新增，有则更新）。部署方式：在 `cloudfunctions/upsertUser` 执行 `npm install`，再在开发者工具中 **上传并部署** 该云函数。

首登不会自动写入 `pets`、`boarding_requests` 等表；待用户填写发布/档案流程时再写入对应集合。

## 后续必做：权限与安全规则

初始化集合后，务必在控制台为每个集合配置 **数据库权限**（如：仅创建者可读写、或结合云函数校验），避免默认规则导致数据暴露。具体规则需按产品与安全要求单独设计。

## 字段参考

完整字段示例见 `docs/pet_boarding_info_platform_prd_paywall.md` 第八节；也可参考本仓库 `cloud/database/samples/` 下各 JSON（便于本地对照，非控制台导入格式）。
