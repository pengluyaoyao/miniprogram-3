# 百炼 API 功能测试指南

## 🎯 目的

测试阿里云百炼 API 是否能正常调用，验证：
- API Key 是否有效
- 应用 ID (App ID) 是否正确
- ChatGPT 的户型描述能否成功传递给百炼
- 百炼能否返回风水分析结果
- 返回数据格式是否正确

## 📋 测试步骤

### 1. 确保已安装 axios
```bash
cd /Users/pengluyao/WeChatProjects/miniprogram-3
npm install axios
```

### 2. 设置环境变量
```bash
# macOS/Linux
export DASHSCOPE_API_KEY=sk-your-dashscope-key

# Windows PowerShell
$env:DASHSCOPE_API_KEY="sk-your-dashscope-key"

# Windows CMD
set DASHSCOPE_API_KEY=sk-your-dashscope-key
```

或者直接修改 `test-bailian.js` 文件中的 `DASHSCOPE_API_KEY` 变量。

### 3. 运行测试脚本
```bash
node test-bailian.js
```

## 🔍 预期结果

### ✅ 成功的输出示例

```
==================== 百炼 API 测试开始 ====================
API Key: 已设置 (***Ab12)
App ID: 443f631a301f4fe69186a7a95beaf0b7

==================== 请求信息 ====================
URL: https://dashscope.aliyuncs.com/api/v1/apps/.../completion

请求数据:
{
  "input": {
    "prompt": "户型图描述：\n**户型整体结构**...",
    "biz_params": {
      "imageURL": "...",
      "area": "120",
      ...
    }
  }
}

==================== 开始调用百炼 API ====================

✅ 百炼 API 调用成功！
耗时: 15.34 秒
响应状态: 200

==================== 百炼 API 完整响应 ====================
{
  "output": {
    "text": "{\"overallScore\":85,\"aspects\":[...]}"
  },
  "usage": {
    "total_tokens": 2345
  },
  "request_id": "xxx-xxx-xxx"
}

==================== 分析结果内容 ====================
{
  "overallScore": 85,
  "aspects": [
    {
      "type": "wealth",
      "title": "财位分析",
      "content": "...",
      "score": 90
    }
  ]
}

==================== 测试完成 ====================
```

### ❌ 常见错误

#### 1. API Key 无效
```
❌ 百炼 API 调用失败！
响应状态: 401
响应数据: {
  "code": "InvalidApiKey",
  "message": "Invalid API-key provided."
}
```

#### 2. App ID 不存在
```
❌ 百炼 API 调用失败！
响应状态: 404
响应数据: {
  "code": "NotFound",
  "message": "App not found"
}
```

#### 3. 权限不足
```
❌ 百炼 API 调用失败！
响应状态: 403
响应数据: {
  "code": "Forbidden",
  "message": "No permission to access this app"
}
```

#### 4. 请求格式错误
```
❌ 百炼 API 调用失败！
响应状态: 400
响应数据: {
  "code": "InvalidParameter",
  "message": "Invalid input format"
}
```

## 🛠️ 故障排查

### 问题1: API Key 未设置
```
❌ 请设置 DASHSCOPE_API_KEY 环境变量
```

**解决**:
1. 登录百炼控制台：https://bailian.console.aliyun.com/
2. 获取 API Key
3. 设置环境变量或修改脚本

### 问题2: App ID 错误
**检查**:
1. 登录百炼控制台
2. 进入应用详情
3. 确认 App ID 是否为 `443f631a301f4fe69186a7a95beaf0b7`
4. 如果不同，修改 `test-bailian.js` 中的 `APP_ID` 常量

### 问题3: 返回数据格式不符合预期
**调整**:
1. 查看完整响应数据
2. 根据实际格式修改解析逻辑
3. 可能的格式：
   - `response.data.output.text` (文本)
   - `response.data.output` (对象)
   - `response.data.result.output` (嵌套)

### 问题4: 超时
```
Error: timeout of 300000ms exceeded
```

**可能原因**:
1. 百炼 API 处理时间过长（> 5分钟）
2. 网络问题
3. 应用配置问题

**解决**:
1. 检查百炼应用配置
2. 简化输入数据
3. 增加超时时间（不推荐）

## 📊 测试数据说明

### 模拟的 ChatGPT 户型描述
```
**户型整体结构**：本户型为三室两厅一厨两卫，整体坐北朝南。

**房间方位描述**：
- 主卧：位于东南角，朝南。
- 次卧A：位于东北角，朝东。
...
```

### 模拟的用户信息
```javascript
{
  area: '120',              // 面积
  rooms: '三室两厅',         // 房型
  orientation: '南北通透',   // 朝向
  floor: '12',              // 楼层
  totalFloors: '32',        // 总楼层
  birthday: '1990-05-15 上午8点',  // 生辰
  focusAspects: ['财位', '主卧', '厨房']  // 关注点
}
```

## 🔄 使用实际 ChatGPT 结果测试

如果你已经运行了 `test-chatgpt.js` 并得到了实际结果，可以：

1. 复制 ChatGPT 的返回内容
2. 修改 `test-bailian.js` 中的 `MOCK_CHATGPT_DESCRIPTION` 常量
3. 重新运行测试

```javascript
const MOCK_CHATGPT_DESCRIPTION = `
// 粘贴你从 test-chatgpt.js 得到的实际内容
`;
```

## 📝 验证清单

- [ ] axios 包已安装
- [ ] DASHSCOPE_API_KEY 已配置
- [ ] App ID 正确
- [ ] 测试脚本运行成功
- [ ] 百炼返回了分析结果
- [ ] 结果格式正确（JSON 或文本）
- [ ] 响应时间可接受（< 30秒）
- [ ] 结果内容合理（包含风水分析）

## 🎯 下一步

### 如果测试成功：
1. ✅ 确认百炼 API 正常工作
2. ✅ 确认 ChatGPT 描述可以被百炼接受
3. ✅ 可以继续集成到云函数
4. ✅ 测试完整的两阶段流程（ChatGPT + 百炼）

### 如果测试失败：
1. ❌ 根据错误信息排查问题
2. ❌ 检查 API Key、App ID、网络
3. ❌ 检查百炼应用配置
4. ❌ 联系阿里云技术支持

## 💰 成本估算

单次测试成本：
- 百炼 API 调用：约 0.1-0.5元/次
- 具体价格以阿里云百炼定价为准

## 🆘 获取帮助

如果遇到问题：
1. 查看阿里云百炼文档：https://help.aliyun.com/zh/model-studio/
2. 检查 API 状态：百炼控制台
3. 查看应用详情：确认配置正确
4. 联系阿里云技术支持

## 📌 注意事项

1. **API Key 安全**: 不要将 API Key 提交到代码库
2. **App ID**: 确保使用正确的应用 ID
3. **成本控制**: 注意 API 调用次数和费用
4. **超时设置**: 百炼 API 可能需要较长时间（10-30秒）
5. **返回格式**: 根据实际返回调整解析逻辑

## 🔗 相关文档

- ChatGPT 测试指南: `TEST_CHATGPT_GUIDE.md`
- 完整集成指南: `CHATGPT_INTEGRATION_GUIDE.md`
- 异步修复指南: `ASYNC_FIX_GUIDE.md`


