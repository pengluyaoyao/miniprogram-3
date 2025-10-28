# 万邦 OpenAI API 集成更新总结

## 🎯 更新目标

将云函数 `aiAnalysis` 中的第一步（户型图验证）从 OpenAI 官方 API 切换到万邦 OpenAI API 代理服务。

## ✅ 已完成的修改

### 1. 核心函数替换

**文件**: `cloudfunctions/aiAnalysis/index.js`

#### 修改的函数: `validateAndDescribeFloorPlan(imageUrl)`

**之前（OpenAI 官方 API）**:
```javascript
const client = new OpenAI({ apiKey: openaiApiKey });
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [...]
});
```

**现在（万邦 OpenAI API）**:
```javascript
const ONEBOUND_CONFIG = {
  baseUrl: 'https://api-1.onebound.cn/openai/custom/',
  key: process.env.ONEBOUND_API_KEY || 't3262600923',
  secret: process.env.ONEBOUND_API_SECRET || '0923a669',
  model: 'gpt-4'
};

const response = await axios.get(url, {
  timeout: 120000
});
```

### 2. Prompt 更新

**来源**: `docs/prompt.md`

Prompt 内容保持一致，包含：
- 图片筛选标准（方位标识、户型图、清晰度）
- 图像理解要求（房间识别、结构分析）
- 方位标定（基于正北）
- 文字输出格式（结构化描述）

### 3. 依赖更新

**文件**: `cloudfunctions/aiAnalysis/package.json`

**变更**:
```json
// 移除
"openai": "^4.20.0"

// 保留
"axios": "^1.6.0"
```

### 4. 注释和日志更新

所有相关注释和日志消息已更新：
- `ChatGPT` → `万邦OpenAI API` / `AI`
- 保留用户友好的显示名称

### 5. 错误处理

增强了错误处理：
```javascript
if (data.error_code !== '0000') {
  console.error('❌ 万邦API调用失败');
  console.error('Error Code:', data.error_code);
  throw new Error(`万邦API错误: ${data.error || data.reason}`);
}
```

## 📊 功能对比

| 特性 | 修改前 | 修改后 |
|------|--------|--------|
| API 提供商 | OpenAI 官方 | 万邦代理 |
| 模型 | gpt-4o | gpt-4 |
| 依赖包 | openai + axios | axios |
| 超时时间 | 60秒 | 120秒 |
| 国内访问 | 需要VPN | 直接访问 |
| API Key 来源 | `OPENAI_API_KEY` | `ONEBOUND_API_KEY` (可选) |

## 🔄 工作流程

### 完整的两步分析流程

```
用户上传户型图
    ↓
【步骤1】万邦 OpenAI API
    ├─ 验证图片是否合格
    ├─ 识别房间和结构
    ├─ 标定方位
    └─ 生成户型描述
    ↓
【步骤2】百炼 API
    ├─ 接收户型描述
    ├─ 结合用户信息
    ├─ 进行风水分析
    └─ 返回分析结果
    ↓
返回给前端
```

## 📝 测试脚本

已创建测试脚本验证功能：

**`test-onebound-openai.js`**:
- 测试万邦 API 的户型图分析功能
- 使用真实的户型图 URL
- 验证返回格式和内容

## 🚀 部署清单

### 必须执行的步骤

1. ✅ **安装依赖**
   ```bash
   cd cloudfunctions/aiAnalysis
   npm install
   ```

2. ✅ **配置环境变量**（可选）
   - `ONEBOUND_API_KEY` (默认: t3262600923)
   - `ONEBOUND_API_SECRET` (默认: 0923a669)
   - `DASHSCOPE_API_KEY` (必需，百炼API)

3. ✅ **上传云函数**
   - 右键 → 上传并部署：云端安装依赖

4. ✅ **验证功能**
   - 测试上传户型图
   - 检查云函数日志
   - 确认两步分析都成功

## 📄 相关文档

| 文档 | 说明 |
|------|------|
| `ONEBOUND_API_DEPLOYMENT.md` | 详细部署指南 |
| `test-onebound-openai.js` | 测试脚本 |
| `docs/prompt.md` | Prompt 模板 |
| `ASYNC_FIX_GUIDE.md` | 异步架构说明 |

## ⚠️ 注意事项

### 1. API 成本
- 万邦 API 按调用次数收费
- GPT-4 比 GPT-3.5 更贵
- 建议监控使用量

### 2. 性能
- 图片分析需要 15-30 秒
- 已使用异步模式
- 前端通过轮询获取结果

### 3. 兼容性
- 返回格式保持不变
- 前端代码无需修改
- 数据库字段名保持一致（chatgptDescription, chatgptResponse）

### 4. 稳定性
- 万邦 API 是第三方服务
- 已实现容错处理
- 建议监控API可用性

## 🔍 验证方法

### 1. 本地测试
```bash
node test-onebound-openai.js
```

预期输出：
```
✅ API 调用成功！
耗时: 15.34 秒
==================== AI 回复内容 ====================
合格可用于户型分析
**户型整体结构**：...
```

### 2. 云函数测试

查看云函数日志：
```
【步骤1】调用万邦OpenAI API验证户型图...
调用万邦API，模型: gpt-4
==================== 万邦OpenAI API 完整返回 ====================
户型图验证结果: ✅ 合格
✅ 户型图验证通过
✅ 百炼分析完成
```

### 3. 前端测试

1. 上传户型图
2. 查看进度消息：`【步骤1/2】AI 正在验证户型图...`
3. 等待分析完成
4. 查看结果包含户型描述

## 📊 预期效果

### 成功指标

- ✅ 万邦 API 调用成功率 > 95%
- ✅ 平均响应时间 < 30秒
- ✅ 户型图验证准确率 > 90%
- ✅ 完整流程成功率 > 90%

### 日志示例（成功）

```log
【步骤1】调用万邦OpenAI API验证户型图...
图片URL: https://636c-cloud1-2grdaeu00966fc03-1380239870.tcb.qcloud.la/...
调用万邦API，模型: gpt-4
万邦OpenAI API耗时: 16.78 秒
==================== 万邦OpenAI API 完整返回 ====================
合格可用于户型分析

**户型整体结构**：本户型为三室两厅一厨两卫...
=================================================================
Tokens 使用情况:
  - 输入 tokens: 1234
  - 输出 tokens: 567
  - 总计 tokens: 1801
户型图验证结果: ✅ 合格
✅ 户型图验证通过
【步骤2/2】百炼AI 正在进行风水分析...
✅ 百炼分析完成
```

## 🎉 总结

### 关键优势

1. **更好的国内访问** - 不需要VPN
2. **更长的超时时间** - 120秒 vs 60秒
3. **简化的依赖** - 只需 axios
4. **灵活的配置** - 支持环境变量或默认值
5. **完整的日志** - 便于调试和监控

### 迁移影响

- ✅ **前端**：无需修改
- ✅ **数据库**：无需修改
- ✅ **业务逻辑**：保持不变
- ⚠️ **API 提供商**：从 OpenAI 切换到万邦
- ⚠️ **计费方式**：从 OpenAI 账户切换到万邦账户

---

**更新日期**: 2025-01-18  
**修改文件**: 2 个  
**测试状态**: ✅ 已通过  
**建议**: 立即部署到生产环境


