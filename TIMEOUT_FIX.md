# 云函数超时问题修复说明

## 问题描述

调用 AI 分析云函数时出现超时错误：
```
{"errorCode":-1,"errorMessage":"Invoking task timed out after 3 seconds","statusCode":433}
```

## 问题原因

1. **云函数执行时间长**：调用阿里云百炼 API 进行 AI 分析需要较长时间（通常 10-60 秒）
2. **默认超时设置不足**：原配置可能无法满足实际需求

## 解决方案

### 1. 增加云函数超时配置

**修改文件**: `cloudfunctions.json`

```json
{
  "name": "aiAnalysis",
  "timeout": 120,          // 从 60 秒增加到 120 秒
  "memorySize": 256,       // 增加内存配置
  "envVariables": {
    "DASHSCOPE_API_KEY": "",
    "APP_ID": ""
  },
  "runtime": "Nodejs18.15"
}
```

**说明**:
- `timeout`: 120 秒（2 分钟），足够处理大多数 AI 分析请求
- `memorySize`: 256 MB，提供更多内存资源

### 2. 增加 HTTP 请求超时时间

**修改文件**: `cloudfunctions/aiAnalysis/index.js`

```javascript
const response = await axios.post(url, data, {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  timeout: 90000  // 从 30 秒增加到 90 秒
});
```

**说明**: 阿里云百炼 API 在处理复杂分析时可能需要较长时间，90 秒的超时配置更加合理。

### 3. 优化前端用户体验

**修改文件**: `miniprogram/pages/analysis/analysis.ts`

#### 3.1 添加加载提示

```typescript
// 显示加载提示
wx.showLoading({
  title: 'AI分析中...',
  mask: true  // 阻止用户操作
});
```

#### 3.2 优化错误提示

```typescript
// 使用 Modal 显示详细错误信息
wx.showModal({
  title: '分析失败',
  content: errorMsg,
  showCancel: false,
  confirmText: '我知道了'
});
```

#### 3.3 确保关闭加载状态

```typescript
// 无论成功还是失败，都要隐藏 loading
wx.hideLoading();
```

## 超时时间配置层级

```
┌─────────────────────────────────────────┐
│ 云函数配置 (cloudfunctions.json)         │
│ timeout: 120 秒                          │
│ ↓ 最外层保护，云函数执行的最大时间        │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ Axios HTTP 请求 (index.js)               │
│ timeout: 90 秒                           │
│ ↓ 调用阿里云百炼 API 的超时时间          │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 阿里云百炼 API                           │
│ 实际处理时间: 10-60 秒                   │
│ ↓ AI 模型执行分析                        │
└─────────────────────────────────────────┘
```

## 配置原则

1. **云函数超时** > **HTTP 请求超时** > **实际处理时间**
2. 预留足够的缓冲时间处理网络延迟
3. 考虑极端情况下的最长处理时间

## 部署步骤

### 1. 更新云函数配置

```bash
# 修改完 cloudfunctions.json 后
# 在微信开发者工具中：
右键 cloudfunctions/aiAnalysis 
→ 选择"上传并部署：云端安装依赖"
```

### 2. 验证配置

在云开发控制台查看云函数配置：
- **超时时间**: 120 秒 ✅
- **内存**: 256 MB ✅
- **环境变量**: DASHSCOPE_API_KEY, APP_ID ✅

### 3. 测试功能

1. 在小程序分析页面输入户型信息
2. 点击"开始分析"
3. 观察加载提示 "AI分析中..."
4. 等待分析结果（可能需要 30-60 秒）
5. 查看云函数日志确认执行成功

## 监控建议

### 1. 查看云函数日志

在云开发控制台 → 云函数 → aiAnalysis → 日志：

- 请求参数是否正确
- API 调用是否成功
- 响应时间统计
- 错误信息详情

### 2. 性能指标

关注以下指标：
- **平均执行时间**: 应该在 20-40 秒
- **成功率**: 应该 > 95%
- **超时次数**: 应该接近 0

### 3. 异常情况处理

如果仍然出现超时：

**可能原因**:
- 阿里云百炼 API 服务异常
- 网络连接不稳定
- 请求参数过于复杂

**解决方案**:
- 检查 API Key 是否有效
- 查看阿里云服务状态
- 简化分析参数
- 联系阿里云技术支持

## 用户体验优化

### 等待时间说明

在分析页面添加提示：
```
"AI 分析需要 30-60 秒，请耐心等待"
```

### 进度反馈

考虑添加进度条或动画效果：
- 阶段 1: 接收参数 ⏳
- 阶段 2: AI 分析中 🤖
- 阶段 3: 生成报告 📊

### 失败重试

允许用户重试失败的分析：
```typescript
wx.showModal({
  title: '分析失败',
  content: '网络不稳定，是否重试？',
  confirmText: '重试',
  success: (res) => {
    if (res.confirm) {
      this.startAnalysis();
    }
  }
});
```

## 相关文件

- `/cloudfunctions.json` - 云函数配置
- `/cloudfunctions/aiAnalysis/index.js` - 云函数代码
- `/miniprogram/services/aiService.ts` - 前端服务
- `/miniprogram/pages/analysis/analysis.ts` - 分析页面

## 技术文档

- [微信云开发 - 云函数](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/capabilities.html#云函数)
- [阿里云百炼 API 文档](https://help.aliyun.com/zh/model-studio/developer-reference/api-reference)
- [Axios 配置文档](https://axios-http.com/docs/req_config)

## 更新日志

- **2025-10-03**: 修复超时问题
  - 云函数超时: 60s → 120s
  - HTTP 超时: 30s → 90s
  - 增加内存配置: 256 MB
  - 优化前端加载提示

