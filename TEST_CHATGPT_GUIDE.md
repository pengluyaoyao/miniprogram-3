# ChatGPT 功能测试指南

## 🎯 目的

测试 ChatGPT API 是否能正常调用，验证：
- API Key 是否有效
- 网络连接是否正常
- 图片分析功能是否工作
- 户型图验证逻辑是否正确

## 📋 测试步骤

### 方法1: 使用测试脚本（推荐）

#### 1. 确保已安装 OpenAI 包
```bash
cd /Users/pengluyao/WeChatProjects/miniprogram-3
npm install openai
```

#### 2. 设置环境变量
```bash
# macOS/Linux
export OPENAI_API_KEY=sk-your-api-key-here

# Windows PowerShell
$env:OPENAI_API_KEY="sk-your-api-key-here"

# Windows CMD
set OPENAI_API_KEY=sk-your-api-key-here
```

#### 3. 运行测试脚本
```bash
node test-chatgpt.js
```

### 方法2: 在云函数中添加测试接口

#### 1. 在云函数中添加测试 case

编辑 `cloudfunctions/aiAnalysis/index.js`，在 switch 语句中添加：

```javascript
case 'testChatGPT':
  return await testChatGPTFunction(params);
```

然后添加测试函数（已在 test-chatgpt.js 中提供）

#### 2. 在微信开发者工具中测试

```javascript
wx.cloud.callFunction({
  name: 'aiAnalysis',
  data: {
    name: 'testChatGPT',
    imageUrl: 'https://image1.ljcdn.com/newhouse-user-image/4410b021a472539aa26e93eaec9cf192.jpg'
  }
}).then(res => {
  console.log('测试结果:', res);
}).catch(err => {
  console.error('测试失败:', err);
});
```

## 🔍 预期结果

### ✅ 成功的输出示例

```
==================== ChatGPT 测试开始 ====================
API Key: 已设置 (***Ab12)

测试图片URL: https://image1.ljcdn.com/...

开始调用 ChatGPT...

✅ ChatGPT 调用成功！
耗时: 3.45 秒

==================== ChatGPT 返回结果 ====================
合格可用于户型分析

**户型整体结构**：本户型为三室两厅一厨两卫，整体坐北朝南。

**房间方位描述**：
- 主卧：位于东南角，朝南。
- 次卧A：位于东北角，朝东。
- 客厅：在南部中央区域，连接南向阳台。
...

==================== 结果分析 ====================
✅ 验证结果: 合格的户型图

==================== 测试完成 ====================
模型: gpt-4o-2024-05-13
总 tokens: 1234
输入 tokens: 890
输出 tokens: 344
```

### ❌ 失败的情况

#### 1. API Key 无效
```
❌ ChatGPT 调用失败！
错误类型: APIError
错误消息: Incorrect API key provided

💡 这可能是 API Key 无效，请检查：
   1. API Key 是否正确
   2. API Key 是否有余额
   3. 访问 https://platform.openai.com/account/api-keys 查看
```

#### 2. 网络问题
```
❌ ChatGPT 调用失败！
错误类型: Error
错误消息: connect ETIMEDOUT

💡 这可能是网络问题，请检查：
   1. 网络连接是否正常
   2. 是否需要代理访问 OpenAI
```

#### 3. 额度不足
```
❌ ChatGPT 调用失败！
错误类型: APIError
错误消息: You exceeded your current quota
```

## 🛠️ 故障排查

### 问题1: 找不到 OpenAI 模块
```
Error: Cannot find module 'openai'
```

**解决**:
```bash
npm install openai
```

### 问题2: API Key 未设置
```
❌ 请设置 OPENAI_API_KEY 环境变量
```

**解决**:
1. 获取 API Key: https://platform.openai.com/api-keys
2. 设置环境变量（见上方步骤2）
3. 或者直接修改 `test-chatgpt.js` 文件中的 `OPENAI_API_KEY` 变量

### 问题3: 图片无法访问
```
Error: Image URL is not accessible
```

**解决**:
1. 确保图片URL是公开可访问的
2. 尝试在浏览器中打开图片URL
3. 更换测试图片URL

### 问题4: 模型不存在
```
Error: The model 'gpt-4o' does not exist
```

**解决**:
1. 检查你的 OpenAI 账号是否有 GPT-4 访问权限
2. 尝试使用 `gpt-4-vision-preview` 或 `gpt-4-turbo`
3. 联系 OpenAI 确认账号权限

## 📊 成本估算

单次测试成本：
- 模型: GPT-4o
- 输入: ~900 tokens（prompt + 图片）
- 输出: ~500 tokens（描述）
- 总成本: 约 $0.01（0.07元人民币）

## ✅ 测试检查清单

- [ ] OpenAI 包已安装
- [ ] API Key 已配置
- [ ] 测试脚本运行成功
- [ ] ChatGPT 返回合理的户型描述
- [ ] 验证逻辑正确（合格/不合格判断）
- [ ] 方位描述准确（东南西北）
- [ ] 响应时间可接受（< 10秒）

## 🔄 下一步

如果测试成功：
1. ✅ 确认 ChatGPT 功能正常
2. ✅ 可以继续测试云函数集成
3. ✅ 配置云函数环境变量 `OPENAI_API_KEY`
4. ✅ 部署并测试完整流程

如果测试失败：
1. ❌ 根据错误信息排查问题
2. ❌ 检查 API Key、网络、余额
3. ❌ 解决问题后重新测试
4. ❌ 必要时联系 OpenAI 支持

## 📝 注意事项

1. **API Key 安全**: 不要将 API Key 提交到代码库
2. **成本控制**: 测试时注意 API 调用次数
3. **网络环境**: 某些地区可能需要代理访问 OpenAI
4. **模型选择**: 确保使用支持视觉的模型（gpt-4o、gpt-4-vision-preview 等）

## 🆘 获取帮助

如果遇到问题：
1. 查看 OpenAI 文档: https://platform.openai.com/docs
2. 检查 API 状态: https://status.openai.com/
3. 查看账户余额: https://platform.openai.com/account/usage


