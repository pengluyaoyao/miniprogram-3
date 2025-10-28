# 万邦 OpenAI API 部署指南

## 📋 更新说明

云函数 `aiAnalysis` 已经从直接使用 OpenAI SDK 切换到使用**万邦 OpenAI API 代理服务**。

### 🔄 主要变更

1. **API 提供商变更**
   - 从：OpenAI 官方 API (`gpt-4o`)
   - 到：万邦 OpenAI API 代理 (`gpt-4`)

2. **依赖变更**
   - 移除：`openai` npm 包
   - 保留：`axios` 用于 HTTP 请求

3. **环境变量变更**
   - 旧：`OPENAI_API_KEY`
   - 新：`ONEBOUND_API_KEY` 和 `ONEBOUND_API_SECRET` (可选)

## 🚀 部署步骤

### 1. 准备工作

#### 获取万邦 API 凭证

- API Key: `t3262600923`
- API Secret: `0923a669`
- 基础 URL: `https://api-1.onebound.cn/openai/custom/`

> **注意**：如果你有自己的万邦 API 账号，可以在云函数环境变量中设置 `ONEBOUND_API_KEY` 和 `ONEBOUND_API_SECRET`。

### 2. 安装依赖

在云函数目录中运行：

```bash
cd cloudfunctions/aiAnalysis
npm install
```

确保 `package.json` 包含以下依赖：

```json
{
  "dependencies": {
    "wx-server-sdk": "~2.6.3",
    "axios": "^1.6.0"
  }
}
```

### 3. 配置环境变量（可选）

在微信开发者工具中，右键云函数 → 云函数配置 → 添加环境变量：

| 变量名 | 说明 | 必填 | 默认值 |
|--------|------|------|--------|
| `ONEBOUND_API_KEY` | 万邦 API Key | 否 | `t3262600923` |
| `ONEBOUND_API_SECRET` | 万邦 API Secret | 否 | `0923a669` |
| `DASHSCOPE_API_KEY` | 阿里云百炼 API Key | 是 | - |

> **提示**：如果不设置环境变量，云函数会使用代码中的默认值。

### 4. 部署云函数

在微信开发者工具中：

1. 右键 `cloudfunctions/aiAnalysis` 目录
2. 选择 **上传并部署：云端安装依赖**
3. 等待部署完成

### 5. 验证部署

查看云函数日志，确认以下信息：

```
【步骤1】调用万邦OpenAI API验证户型图...
图片URL: https://...
调用万邦API，模型: gpt-4
万邦OpenAI API耗时: 15.23 秒
==================== 万邦OpenAI API 完整返回 ====================
```

## 📊 API 对比

| 特性 | OpenAI 官方 | 万邦 OpenAI 代理 |
|------|-------------|-----------------|
| 模型 | `gpt-4o` | `gpt-4` |
| 访问方式 | 直接 SDK | HTTP API |
| 需要 VPN | 是 | 否 |
| 国内访问 | 困难 | 稳定 |
| 超时时间 | 60秒 | 120秒 |
| 计费方式 | OpenAI 账户 | 万邦账户 |

## 🔧 故障排查

### 问题 1: 万邦API调用失败

**错误信息**：`Error Code: 2000` 或 `timeout`

**解决方案**：
1. 检查 API Key 和 Secret 是否正确
2. 确认万邦账户余额充足
3. 检查网络连接
4. 查看云函数日志了解详细错误

### 问题 2: 图片无法访问

**错误信息**：`万邦API错误: Invalid image URL`

**解决方案**：
1. 确认图片 URL 可公开访问
2. 使用腾讯云存储的临时 URL（`wx.cloud.getTempFileURL`）
3. 检查图片格式（支持 JPG、PNG）

### 问题 3: 超时错误

**错误信息**：`timeout of 120000ms exceeded`

**解决方案**：
1. 这通常是正常现象，AI 分析需要时间
2. 云函数已设置 120 秒超时
3. 使用异步模式（已实现），前端轮询结果

## 📝 代码示例

### 调用云函数

```javascript
// 前端代码
const result = await wx.cloud.callFunction({
  name: 'aiAnalysis',
  data: {
    name: 'createAnalysis',
    imageUrl: 'https://...',  // 户型图 URL
    houseInfo: {
      area: '120',
      rooms: '三室两厅',
      orientation: '南北通透',
      floor: '12',
      totalFloors: '32',
      birthday: '1990-05-15 上午8点',
      focusAspects: ['财位', '主卧', '厨房']
    }
  }
});

console.log('任务ID:', result.result.taskId);

// 轮询获取结果
const checkResult = async (taskId) => {
  const res = await wx.cloud.callFunction({
    name: 'aiAnalysis',
    data: {
      name: 'getAnalysisResult',
      taskId: taskId
    }
  });
  
  if (res.result.status === 'completed') {
    console.log('分析完成:', res.result.result);
  } else if (res.result.status === 'processing') {
    console.log('进度:', res.result.message);
    setTimeout(() => checkResult(taskId), 3000);
  }
};
```

### 云函数内部逻辑

```javascript
// Step 1: 万邦 OpenAI API 验证户型图
const validationResult = await validateAndDescribeFloorPlan(imageUrl);

if (!validationResult.valid) {
  throw new Error('请上传合格的户型图');
}

// Step 2: 使用描述调用百炼 API
const bailianResult = await callBailianAPI(
  validationResult.description,
  imageUrl,
  houseInfo
);

return {
  ...bailianResult,
  chatgptDescription: validationResult.description,
  tokensUsed: validationResult.tokensUsed
};
```

## 🔗 相关资源

- **万邦 OpenAI API 文档**: https://open.onebound.cn/help/api/openai.custom.html
- **百炼控制台**: https://bailian.console.aliyun.com/
- **测试脚本**: 
  - `test-onebound-openai.js` - 测试万邦 API
  - `test-bailian.js` - 测试百炼 API

## ⚠️ 注意事项

1. **成本控制**
   - 万邦 API 按调用次数收费
   - GPT-4 模型比 GPT-3.5 更贵
   - 建议监控 API 使用量

2. **性能考虑**
   - 图片分析通常需要 15-30 秒
   - 使用异步模式避免前端超时
   - 云函数设置了 120 秒超时保护

3. **数据隐私**
   - 图片会发送到万邦服务器
   - 确保用户了解并同意
   - 不要上传敏感信息

4. **稳定性**
   - 万邦 API 是第三方代理
   - 建议实现错误重试机制
   - 保留回退方案（原 OpenAI API）

## 📊 监控和日志

查看云函数日志以监控：

- **API 调用次数**
- **平均响应时间**
- **错误率**
- **Token 使用量**

关键日志标识：
```
【步骤1】调用万邦OpenAI API验证户型图...
万邦OpenAI API耗时: X.XX 秒
Tokens 使用情况: XXX
户型图验证结果: ✅ 合格
```

## 🔄 回滚方案

如果需要回到 OpenAI 官方 API：

1. 恢复 `package.json` 中的 `openai` 依赖
2. 还原 `index.js` 中的 `validateAndDescribeFloorPlan` 函数
3. 重新部署云函数
4. 设置 `OPENAI_API_KEY` 环境变量

## ✅ 验证清单

部署后检查：

- [ ] 云函数部署成功
- [ ] 依赖安装完成（axios）
- [ ] 环境变量配置正确（DASHSCOPE_API_KEY）
- [ ] 测试上传户型图
- [ ] 查看云函数日志
- [ ] 确认万邦 API 调用成功
- [ ] 确认百炼 API 调用成功
- [ ] 前端显示分析结果
- [ ] 检查 Token 使用情况

## 📞 技术支持

如遇问题：

1. 查看云函数日志
2. 检查 `ONEBOUND_API_DEPLOYMENT.md`（本文档）
3. 运行测试脚本：`node test-onebound-openai.js`
4. 联系万邦技术支持：QQ 3142401606

---

**最后更新**: 2025-01-18  
**版本**: v2.0（万邦 OpenAI API）


