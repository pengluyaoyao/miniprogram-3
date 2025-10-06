# 阿里云百炼工作流配置说明

## 📋 工作流参数接收配置

在阿里云百炼控制台创建工作流应用时，需要配置以下参数：

### 输入参数配置

#### 1. Prompt 参数
- **参数名**: `prompt`
- **类型**: String
- **说明**: 户型描述的主要内容
- **来源**: 用户输入的户型描述文本

#### 2. Business Parameters (biz_params)
工作流应用需要接收以下业务参数：

| 参数名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| `imageURL` | String | 户型描述文本 | "三室两厅，南北通透..." |
| `area` | String | 房屋面积 | "120平米" |
| `rooms` | String | 房间数量 | "3室2厅" |
| `directions` | String | 房屋朝向 | "南北朝向" |
| `floor` | String | 楼层信息 | "5/20"（表示20层的第5层） |
| `birth` | String | 生辰信息 | "1990-01-01" |
| `focus` | String | 关注方面 | "财位、主卧、厨房" |

## 📊 数据流程图

```
前端 (analysis.ts)
  ↓
  调用 aiService.createAnalysis()
  ↓
云函数 (aiAnalysis/index.js)
  ↓
  构建请求数据:
  {
    input: {
      prompt: "户型描述",
      biz_params: {
        imageURL: "户型描述",
        area: "120平米",
        rooms: "3室2厅",
        directions: "南北朝向",
        floor: "5/20",
        birth: "1990-01-01",
        focus: "财位、主卧、厨房"
      }
    }
  }
  ↓
阿里云百炼工作流
  ↓
  AI 分析处理
  ↓
返回结果 (JSON)
```

## 🔧 工作流应用配置步骤

### 1. 在百炼控制台创建工作流应用

1. 登录 [阿里云百炼控制台](https://bailian.console.aliyun.com/)
2. 进入"应用中心" → "创建应用"
3. 选择"工作流应用"

### 2. 配置输入节点

在工作流的输入节点中配置：

**主输入（Prompt）：**
```json
{
  "name": "prompt",
  "type": "string",
  "description": "户型描述内容"
}
```

**业务参数（Biz Params）：**
```json
{
  "name": "biz_params",
  "type": "object",
  "properties": {
    "imageURL": {
      "type": "string",
      "description": "户型描述"
    },
    "area": {
      "type": "string",
      "description": "房屋面积"
    },
    "rooms": {
      "type": "string",
      "description": "房间数量"
    },
    "directions": {
      "type": "string",
      "description": "房屋朝向"
    },
    "floor": {
      "type": "string",
      "description": "楼层信息"
    },
    "birth": {
      "type": "string",
      "description": "生辰信息"
    },
    "focus": {
      "type": "string",
      "description": "关注方面"
    }
  }
}
```

### 3. 配置 LLM 节点

在工作流中添加 LLM 节点，配置：

- **模型**: 选择合适的通义千问模型（如 qwen-plus、qwen-max）
- **Prompt 模板**: 引用输入参数
  ```
  请作为专业的风水大师，对以下户型进行详细分析：
  
  户型描述：${prompt}
  
  补充信息：
  - 面积：${biz_params.area}
  - 房间数：${biz_params.rooms}
  - 朝向：${biz_params.directions}
  - 楼层：${biz_params.floor}
  - 生辰：${biz_params.birth}
  - 关注方面：${biz_params.focus}
  
  请从财位、健康、事业、感情等方面进行分析，并以 JSON 格式返回结果。
  ```

### 4. 配置输出节点

配置返回 JSON 格式的分析结果：

```json
{
  "overallScore": 85,
  "aspects": [
    {
      "type": "财位",
      "title": "财位分析",
      "content": "详细的分析内容...",
      "score": 90,
      "suggestions": ["建议1", "建议2"],
      "color": "#00a870"
    }
  ],
  "summary": "整体分析总结"
}
```

## 🔑 环境变量配置

在微信云开发控制台配置环境变量：

| 变量名 | 说明 | 获取方式 |
|--------|------|---------|
| `DASHSCOPE_API_KEY` | 阿里云 API Key | 百炼控制台 → API-KEY 管理 |
| `APP_ID` | 工作流应用 ID | 工作流应用详情页 → 应用 ID |

## 🧪 测试建议

### 1. 测试请求示例

```javascript
// 在云函数中的请求数据
{
  input: {
    prompt: "三室两厅，南北通透，客厅朝南，主卧朝南",
    biz_params: {
      imageURL: "三室两厅，南北通透，客厅朝南，主卧朝南",
      area: "120平米",
      rooms: "3室2厅",
      directions: "南北朝向",
      floor: "5/20",
      birth: "1990-01-01",
      focus: "财位、主卧、厨房"
    }
  },
  parameters: {},
  debug: {}
}
```

### 2. 调试步骤

1. **云函数日志**：查看云开发控制台的云函数日志
2. **请求数据**：确认发送到百炼的数据格式正确
3. **响应数据**：检查百炼返回的数据结构
4. **错误处理**：查看错误信息，调整配置

### 3. 常见问题

**问题 1**: 参数未接收到
- **解决**: 检查工作流输入节点是否正确配置了 `biz_params`

**问题 2**: 返回格式错误
- **解决**: 在 LLM 节点的 Prompt 中明确要求返回 JSON 格式

**问题 3**: API Key 无效
- **解决**: 重新生成 API Key，并更新云函数环境变量

## 📝 相关文件

- `/cloudfunctions/aiAnalysis/index.js` - 云函数主文件
- `/miniprogram/services/aiService.ts` - 前端服务
- `/miniprogram/pages/analysis/analysis.ts` - 分析页面

## 🚀 部署流程

1. **修改云函数代码** ✅（已完成）
2. **配置环境变量**：在云开发控制台设置 `DASHSCOPE_API_KEY` 和 `APP_ID`
3. **上传云函数**：右键 `cloudfunctions/aiAnalysis` → "上传并部署：云端安装依赖"
4. **配置工作流应用**：按照上述步骤在百炼控制台配置
5. **测试功能**：在小程序中测试户型分析功能

## 📞 技术支持

- [阿里云百炼文档](https://help.aliyun.com/zh/model-studio/)
- [工作流应用指南](https://help.aliyun.com/zh/model-studio/user-guide/workflow-orchestration)
- [API 参考文档](https://help.aliyun.com/zh/model-studio/developer-reference/api-reference)

