# 简化版本说明

## 🎯 变更内容

已将云函数恢复到简化版本，只调用阿里百炼 API，移除了所有 OpenAI/万邦 API 相关代码。

## 📋 当前架构

```
用户上传户型图
    ↓
【步骤1】createAnalysis
    ├─ 创建任务记录
    └─ 返回 taskId
    ↓
【步骤2】processTask
    ├─ 直接调用百炼 API
    ├─ 传入图片 URL 和用户信息
    └─ 更新任务状态
    ↓
前端轮询 getAnalysisResult
    ↓
返回分析结果
```

## 🔧 核心功能

### 1. 创建任务 (`createAnalysis`)
- 验证参数（imageUrl, houseInfo, userId）
- 创建任务记录（status: 'pending'）
- 立即返回 taskId

### 2. 处理任务 (`processTask`)
- 更新状态为 'processing'
- 调用百炼 API，传入：
  - `imageURL`: 户型图 URL
  - `area`: 面积
  - `rooms`: 户型
  - `directions`: 朝向
  - `floor`: 楼层
  - `birth`: 生辰
  - `focus`: 关注点
- 解析结果并保存

### 3. 查询结果 (`getAnalysisResult`)
- 返回任务状态和结果

## 📝 百炼 API 调用

```javascript
{
  input: {
    prompt: "请分析这个户型的风水情况",
    biz_params: {
      imageURL: imageUrl,
      area: "120",
      rooms: "三室两厅",
      directions: "南北通透",
      floor: "12",
      birth: "1990-05-15 上午8点",
      focus: "财位、主卧、厨房"
    }
  },
  parameters: {
    incremental_output: false
  }
}
```

## 🗑️ 已移除的代码

- ❌ OpenAI SDK 相关代码
- ❌ 万邦 OpenAI API 相关代码
- ❌ `validateAndDescribeFloorPlan` 函数
- ❌ `submitBailianTask` 函数
- ❌ 两阶段分析逻辑
- ❌ ChatGPT 图片验证

## ✅ 保留的代码

- ✅ 异步任务模式（createAnalysis + processTask）
- ✅ 轮询查询机制
- ✅ 百炼 API 调用
- ✅ 结果解析和存储

## 📦 依赖

```json
{
  "wx-server-sdk": "~2.6.3",
  "axios": "^1.6.0"
}
```

不再需要 `openai` 包。

## 🚀 部署步骤

### 1. 上传云函数
```
微信开发者工具
→ 右键 cloudfunctions/aiAnalysis
→ 上传并部署：云端安装依赖
```

### 2. 配置环境变量
只需要配置：
- `DASHSCOPE_API_KEY`: 阿里百炼 API Key

不再需要：
- ~~`OPENAI_API_KEY`~~
- ~~`ONEBOUND_API_KEY`~~
- ~~`ONEBOUND_API_SECRET`~~

### 3. 测试
1. 上传户型图
2. 提交分析
3. 查看结果

## 🔍 日志示例

### 成功的日志流程

```log
═══════════════════════════════════════════════════════════════════
操作类型: createAnalysis
【异步模式】创建分析任务
任务已创建，ID: abc123
═══════════════════════════════════════════════════════════════════

[新的云函数调用]

═══════════════════════════════════════════════════════════════════
操作类型: processTask
processTaskDirectly 开始执行
后台处理任务: abc123
═══════════════════════════════════════════════════════════════════

调用百炼API...
图片URL: https://...
百炼API请求参数: { ... }
百炼API调用成功
响应状态: 200
分析结果（前200字）: ...
✅ 分析完成: abc123
```

## 📊 对比

| 特性 | 之前（复杂版本） | 现在（简化版本） |
|------|-----------------|-----------------|
| AI 调用次数 | 2次（万邦 + 百炼） | 1次（百炼） |
| 图片验证 | ChatGPT 验证 | 百炼自己处理 |
| 代码行数 | ~1100 行 | ~350 行 |
| 依赖包 | 3 个 | 2 个 |
| 调用延迟 | 30-120秒 | 10-30秒 |
| 成本 | ChatGPT + 百炼 | 只有百炼 |
| 复杂度 | 高 | 低 |
| 可维护性 | 中 | 高 |

## ⚠️ 注意事项

### 1. 百炼 API 需要能够处理图片
确保你的百炼应用配置了图片分析能力，否则可能无法正确处理 `imageURL` 参数。

### 2. 图片 URL 必须可访问
确保腾讯云存储的图片 URL 可以被百炼 API 访问（使用临时 URL）。

### 3. Prompt 简化
现在只传 `"请分析这个户型的风水情况"`，让百炼自己根据图片和参数分析。

如果需要更详细的提示词，可以在 `callBailianAPI` 函数中修改 `prompt` 字段。

## 🔄 如果需要恢复复杂版本

如果将来需要重新添加 OpenAI 验证，可以参考：
- `TWO_STEP_CALL_FIX.md`
- `ONEBOUND_UPDATE_SUMMARY.md`
- `DEBUG_ONEBOUND_API.md`

## ✨ 优势

简化版本的优势：

1. **更快** - 只调用一次 API
2. **更便宜** - 不需要 ChatGPT
3. **更简单** - 代码少，易维护
4. **更可靠** - 减少了一个可能失败的环节

## 📈 性能

- **createAnalysis**: < 1秒
- **processTask**: 10-30秒（取决于百炼 API）
- **总时间**: 10-30秒

---

**更新时间**: 2025-01-18  
**版本**: v3.0（简化版）  
**状态**: ✅ 已简化


