# ChatGPT + 百炼双AI分析集成指南

## 🎯 功能说明

实现了**两阶段AI分析**流程：

### 阶段1：ChatGPT 图片验证和描述
- **作用**：验证上传的图片是否为合格的户型图
- **模型**：GPT-4o（支持视觉）
- **输入**：图片URL
- **输出**：
  - ✅ 合格：返回户型结构的详细描述
  - ❌ 不合格：返回"请上传合格的户型图"

### 阶段2：百炼 风水分析
- **作用**：基于ChatGPT的描述进行风水分析
- **输入**：ChatGPT的户型描述 + 用户信息（生辰八字、关注点等）
- **输出**：详细的风水分析报告

## 📊 工作流程

```
用户上传图片
    ↓
保存到云存储
    ↓
获取图片URL
    ↓
═══════════════════════════════════════
【阶段1：ChatGPT验证】
═══════════════════════════════════════
    ↓
调用 ChatGPT GPT-4o
    ↓
分析图片是否为户型图
    ↓
┌─────────────┬─────────────┐
│   不合格     │    合格      │
│    ↓        │    ↓         │
│ 返回错误     │ 提取户型描述  │
│    ↓        │    ↓         │
│ 前端提示     │ 继续下一步   │
└─────────────┴─────────────┘
                  ↓
═══════════════════════════════════════
【阶段2：百炼风水分析】
═══════════════════════════════════════
                  ↓
将ChatGPT描述作为prompt
                  ↓
调用百炼API
                  ↓
返回风水分析结果
                  ↓
前端展示
```

## 🔧 代码修改详情

### 1. 新增依赖
**文件**：`cloudfunctions/aiAnalysis/package.json`

```json
{
  "dependencies": {
    "wx-server-sdk": "~2.6.3",
    "axios": "^1.6.0",
    "openai": "^4.20.0"  // 新增
  }
}
```

### 2. 核心函数

#### `validateAndDescribeFloorPlan(imageUrl)`
**ChatGPT图片验证和描述**

```javascript
// 功能：验证是否为合格户型图，并生成描述
// 返回：
// - valid: boolean - 是否合格
// - description: string - 户型描述
// - message: string - 错误消息（如果不合格）
```

**Prompt设计**：
```
请判断这张图片是否是合格的户型图。

判断标准：
- 必须是建筑平面图/户型图
- 能看清房间布局和结构
- 不能是照片、风景图或其他无关图片

如果是合格的户型图，请详细描述：
1. 整体布局（几室几厅）
2. 各个房间的位置和朝向
3. 主要功能区域的分布
4. 门窗的位置
5. 房间之间的相对关系

回复格式：
第一行：合格 或 不合格
如果合格，从第二行开始详细描述户型结构。
```

#### `callBailianAPI(floorPlanDescription, imageUrl, houseInfo)`
**百炼风水分析**

```javascript
// 功能：基于ChatGPT的描述进行风水分析
// 输入：
// - floorPlanDescription: ChatGPT的户型描述
// - imageUrl: 原始图片URL
// - houseInfo: 用户提供的其他信息
```

**新增的 biz_params**：
```javascript
{
  imageURL: imageUrl,           // 原有
  area: houseInfo.area,          // 原有
  rooms: houseInfo.rooms,        // 原有
  directions: houseInfo.orientation,  // 原有
  floor: houseInfo.floor,        // 原有
  birth: houseInfo.birthday,     // 原有
  focus: houseInfo.focusAspects, // 原有
  floorPlanDesc: floorPlanDescription  // 新增：ChatGPT的描述
}
```

**新的 prompt**：
```javascript
prompt: `户型图描述：
${floorPlanDescription}

请基于以上户型图描述和用户信息进行风水分析。`
```

#### `submitBailianTask(params)`
**综合处理函数**

```javascript
// 串联两个阶段
// 1. ChatGPT验证 -> 获取描述
// 2. 百炼分析 -> 返回风水报告
```

## 🚀 部署步骤

### 1. 配置环境变量

在云开发控制台配置以下环境变量：

| 变量名 | 说明 | 获取方式 |
|--------|------|---------|
| `OPENAI_API_KEY` | OpenAI API密钥 | https://platform.openai.com/api-keys |
| `DASHSCOPE_API_KEY` | 阿里云百炼API密钥 | 已配置 |

**配置路径**：
```
云开发控制台 → 云函数 → aiAnalysis → 配置 → 环境变量
```

### 2. 安装依赖并部署

**方法1：使用微信开发者工具**
```
右键点击 cloudfunctions/aiAnalysis
→ 上传并部署：云端安装依赖
```

**方法2：本地安装后上传**
```bash
cd cloudfunctions/aiAnalysis
npm install
# 然后在微信开发者工具中右键上传
```

### 3. 测试流程

1. **上传合格的户型图**
   - 观察日志：应看到 "✅ 户型图验证通过"
   - 查看ChatGPT的描述
   - 等待百炼分析结果

2. **上传不合格的图片**（如风景照）
   - 观察日志：应看到 "❌ 户型图验证失败"
   - 前端显示："请上传合格的户型图"

## 📝 日志示例

### 成功流程：
```
==================== 开始两阶段分析 ====================
【步骤1】调用ChatGPT验证户型图...
图片URL: https://xxxxx
ChatGPT耗时: 3.45 秒
ChatGPT返回: 合格
这是一个三室两厅的户型图...
✅ 户型图验证通过
户型描述: 这是一个三室两厅的户型图...
【步骤2】调用百炼API进行风水分析...
百炼API耗时: 12.34 秒
✅ 百炼分析完成
==================== 两阶段分析结束 ====================
```

### 验证失败流程：
```
==================== 开始两阶段分析 ====================
【步骤1】调用ChatGPT验证户型图...
图片URL: https://xxxxx
ChatGPT耗时: 2.15 秒
ChatGPT返回: 不合格
这张图片是风景照片，不是户型图。
❌ 户型图验证失败
❌ 分析流程失败: 请上传合格的户型图
```

## ⚙️ 配置说明

### ChatGPT配置
```javascript
model: "gpt-4o"           // 支持视觉的模型
max_tokens: 1000          // 最大返回token数
timeout: 默认（通常30秒）  // OpenAI SDK自动处理
```

**可选模型**：
- `gpt-4o`：推荐，速度快，支持视觉
- `gpt-4-vision-preview`：较旧版本
- `gpt-4-turbo`：也支持视觉

### 百炼配置
```javascript
timeout: 300000  // 5分钟（保持不变）
```

## 💰 成本估算

### ChatGPT (GPT-4o)
- **输入**：约 500 tokens（文本prompt + 图片）
- **输出**：约 500 tokens（户型描述）
- **总计**：约 1000 tokens
- **价格**：
  - 输入：$5 / 1M tokens
  - 输出：$15 / 1M tokens
- **单次成本**：约 $0.01（0.07元人民币）

### 百炼API
- **价格**：根据阿里云百炼定价
- **估算**：每次约 0.1-0.5元

### 总成本
**每次分析约 0.2-0.6元**

## 🔍 故障排查

### 问题1：ChatGPT调用失败
**错误**：`缺少 OPENAI_API_KEY 环境变量`  
**解决**：在云开发控制台配置 `OPENAI_API_KEY`

### 问题2：API密钥无效
**错误**：`401 Unauthorized`  
**解决**：检查API密钥是否正确，是否有余额

### 问题3：超时
**错误**：`timeout of 30000ms exceeded`  
**解决**：ChatGPT通常很快，可能是网络问题。百炼已有5分钟超时。

### 问题4：图片URL无法访问
**错误**：ChatGPT返回"无法访问图片"  
**解决**：
- 确保图片URL是公开可访问的
- 检查云存储的访问权限
- 使用 `getTempFileURL` 获取临时访问URL

### 问题5：容错处理
如果ChatGPT调用失败，代码会自动降级：
```javascript
return {
  valid: true,  // 允许继续
  description: '图片分析',
  error: error.message
};
```

## 🎨 前端展示建议

### 显示两阶段进度
```javascript
// 阶段1
wx.showLoading({ title: '正在验证图片...' });

// 阶段2
wx.showLoading({ title: 'AI分析中，请稍候...' });
```

### 显示ChatGPT的描述
```javascript
// 可以在分析结果中加入ChatGPT的户型描述
analysisResult: {
  floorPlanDescription: '三室两厅，南北通透...',  // 新增
  overallScore: 85,
  aspects: [...]
}
```

## 🔄 优化建议

### 1. 缓存ChatGPT结果
如果同一张图片重复分析，可以缓存ChatGPT的描述：
```javascript
// 在数据库中保存
{
  imageUrl: '...',
  gptDescription: '...',
  createTime: new Date()
}
```

### 2. 异步通知
对于耗时较长的分析，可以：
1. 先返回任务ID
2. 完成后推送模板消息通知用户

### 3. 批量处理
如果用户上传多张图片，可以并行调用ChatGPT验证。

## 📊 监控指标

建议监控：
1. **ChatGPT验证通过率**：合格图片比例
2. **平均响应时间**：两个阶段各自的耗时
3. **失败率**：API调用失败的次数
4. **成本统计**：每日API调用成本

## ✅ 测试清单

- [ ] 上传标准户型图 → 应验证通过并返回描述
- [ ] 上传风景照片 → 应返回"请上传合格的户型图"
- [ ] 上传模糊图片 → 测试ChatGPT的判断
- [ ] 检查日志中的描述质量
- [ ] 验证百炼是否正确使用了ChatGPT的描述
- [ ] 测试ChatGPT失败时的容错逻辑
- [ ] 检查成本统计

## 🎉 总结

通过集成ChatGPT，实现了：
- ✅ 图片质量验证（过滤无效图片）
- ✅ 户型结构描述（辅助百炼理解）
- ✅ 提升分析准确性
- ✅ 改善用户体验

**核心优势**：
1. **双AI协作**：ChatGPT专注视觉理解，百炼专注风水分析
2. **质量控制**：在源头过滤无效图片
3. **更好的理解**：结构化的文字描述帮助百炼更准确分析
4. **用户友好**：清晰的错误提示

祝部署顺利！🚀


