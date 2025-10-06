# AI 分析云函数部署指南

## 📋 当前配置

使用 **Node.js** 云函数 `aiAnalysis`，完全按照阿里云官方文档格式。

### 配置信息

| 配置项 | 值 |
|--------|-----|
| 云函数名称 | `aiAnalysis` |
| 运行时 | Node.js 18.15 |
| 超时时间 | **120 秒** |
| 内存 | **512 MB** |
| HTTP 超时 | 90 秒 |

## 🚀 快速部署（3步骤，5分钟）

### 步骤 1: 配置环境变量

在**云开发控制台**配置：

1. 打开 https://console.cloud.tencent.com/tcb
2. 进入你的环境 → 云函数 → `aiAnalysis`
3. 点击"环境变量" → "编辑"
4. 添加以下变量：

```
DASHSCOPE_API_KEY = sk-xxxxxxxxxxxx（从阿里云百炼获取）
APP_ID = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx（工作流应用ID）
```

5. 保存

### 步骤 2: 上传云函数

在**微信开发者工具**中：

```
右键点击: cloudfunctions/aiAnalysis
↓
选择: "上传并部署：云端安装依赖"
↓
等待: 显示"上传成功"（约1-2分钟）
```

### 步骤 3: 验证配置

在云开发控制台确认：

```
✅ 执行超时时间: 120 秒
✅ 运行内存: 512 MB
✅ 环境变量: DASHSCOPE_API_KEY, APP_ID
```

## 📊 API 调用格式

### 完全符合阿里云标准（参考 scratch_4.py）

```javascript
// Node.js 云函数调用方式
const data = {
  input: {
    prompt: houseDescription,    // 主要内容
    biz_params: {                // 业务参数
      imageURL: houseDescription,
      area: '120平米',
      rooms: '3室2厅',
      directions: '南北朝向',
      floor: '10/30',
      birth: '1990-01-01',
      focus: '财位、主卧、厨房'
    }
  },
  parameters: {},
  debug: {}
};

const response = await axios.post(url, data, {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  timeout: 90000
});
```

### 与 Python SDK 的对应关系

```python
# Python SDK (scratch_4.py)
response = Application.call(
    api_key=api_key,
    app_id=app_id,
    prompt='户型描述',
    biz_params={
        'imageURL': '户型描述',
        'area': '120平米',
        # ...
    }
)

# Node.js HTTP 请求（等效）
axios.post(url, {
  input: {
    prompt: '户型描述',
    biz_params: {
      imageURL: '户型描述',
      area: '120平米',
      // ...
    }
  }
})
```

## 🧪 测试功能

### 1. 在小程序中测试

1. 刷新小程序
2. 进入分析页面
3. 输入户型描述："三室两厅，南北通透"
4. 填写其他信息（可选）
5. 点击"开始分析"
6. 等待 30-90 秒
7. 查看分析结果

### 2. 查看云函数日志

在云开发控制台 → 云函数 → aiAnalysis → 日志：

**成功标志**:
```
调用百炼API: https://dashscope.aliyuncs.com/api/v1/apps/...
请求数据: { input: { prompt: ..., biz_params: {...} } }
API响应状态: 200
⏱️ 百炼API耗时: 35.23 秒
分析记录已保存
```

## 🔧 配置阿里云百炼工作流

### 在百炼控制台配置应用

1. 登录 https://bailian.console.aliyun.com/
2. 创建或编辑工作流应用
3. 配置输入参数：

#### 主输入
- **名称**: `prompt`
- **类型**: String
- **说明**: 户型描述内容

#### 业务参数（biz_params）
配置以下字段：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `imageURL` | String | 户型描述（同 prompt） |
| `area` | String | 房屋面积 |
| `rooms` | String | 房间数量 |
| `directions` | String | 房屋朝向 |
| `floor` | String | 楼层信息 |
| `birth` | String | 生辰信息 |
| `focus` | String | 关注方面 |

#### 在 LLM 节点中引用

```
户型描述：${prompt}

补充信息：
- 面积：${biz_params.area}
- 房间数：${biz_params.rooms}
- 朝向：${biz_params.directions}
- 楼层：${biz_params.floor}
- 生辰：${biz_params.birth}
- 关注方面：${biz_params.focus}

请进行详细的风水分析...
```

## 📈 性能监控

### 关键指标

- **平均耗时**: 30-60 秒
- **最长等待**: 90 秒（HTTP 超时）
- **成功率**: > 95%

### 监控日志

查找以下关键日志：

```bash
# 开始调用
调用百炼API: https://dashscope.aliyuncs.com/...

# 请求参数
请求数据: { input: { prompt: "...", biz_params: {...} } }

# 响应时间
⏱️ 百炼API耗时: XX.XX 秒

# 警告（如果耗时过长）
⚠️ API耗时过长 (XX.XX秒)，建议使用异步模式
```

## 🐛 故障排查

### 问题 1: 超时错误

**错误**: `Invoking task timed out after 120 seconds`

**解决方案**:
1. 查看日志中的 API 耗时
2. 如果 < 100 秒：网络问题，重试
3. 如果 > 100 秒：API 太慢，优化 prompt

### 问题 2: API 调用失败

**错误**: `API调用失败: 401`

**检查**:
- DASHSCOPE_API_KEY 是否正确
- API Key 是否过期
- 阿里云账户余额是否充足

**解决**:
- 在云开发控制台重新配置环境变量
- 重新部署云函数

### 问题 3: 参数未接收

**错误**: `缺少户型描述参数`

**检查**:
- 前端是否正确传递参数
- 查看云函数日志中的参数内容

**解决**:
```javascript
// 查看前端控制台
console.log('调用AI分析云函数: aiAnalysis')
console.log('参数:', { imageUrl, houseInfo, userId })
```

### 问题 4: 返回格式错误

**错误**: `API返回数据格式错误`

**检查**:
- 阿里云应用是否正确配置
- 返回是否为 JSON 格式

**解决**:
- 在百炼控制台测试应用
- 确认输出格式为 JSON

## 🔐 安全建议

### 1. 环境变量
- ✅ 使用环境变量存储 API Key
- ❌ 不要在代码中硬编码

### 2. 用户验证
```javascript
// 验证用户身份
if (!userId) {
  throw new Error('缺少用户ID参数');
}
```

### 3. 参数验证
```javascript
// 验证必填参数
if (!houseDescription) {
  throw new Error('缺少户型描述参数');
}
```

## 📝 更新日志

### v1.3 (2025-10-03)
- ✅ 移除 Python 版本（微信云不支持）
- ✅ 优化 Node.js 版本
- ✅ 增加内存到 512 MB
- ✅ 完全符合阿里云标准格式
- ✅ 添加性能监控日志

### v1.2
- ✅ 采用 prompt + biz_params 格式
- ✅ 增加超时时间到 120 秒
- ✅ 优化错误处理

### v1.1
- ✅ 初始版本

## 📞 技术支持

### 相关文档

- [阿里云百炼文档](https://help.aliyun.com/zh/model-studio/)
- [DashScope API 参考](https://help.aliyun.com/zh/model-studio/developer-reference/api-reference)
- [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)

### 其他文档

- `TIMEOUT_FIX.md` - 超时问题解决
- `BAILIAN_WORKFLOW_CONFIG.md` - 工作流配置详解
- `DEPLOY_CHECKLIST.md` - 部署检查清单

---

**更新时间**: 2025-10-03  
**版本**: v1.3  
**状态**: ✅ 生产就绪

