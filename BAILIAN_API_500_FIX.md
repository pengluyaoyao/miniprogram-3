# 百炼API 500错误修复

## 🐛 问题描述

**错误现象**：
- 开始分析时返回 `request failed with error code 500`
- 阿里百炼API的 `input` 格式变成了 `[{"field":"query","source":...` 这样的数组格式
- 而不是预期的户型图URL

**错误日志**：
```
request failed with error code 500
```

---

## 🔍 问题原因

### 错误的API调用格式

**修复前的代码**：
```javascript
const data = {
  input: {
    prompt: imageUrl,  // ❌ 错误：把图片URL作为prompt
    biz_params: {
      imageURL: imageUrl,
      area: houseInfo.area || '未填写',
      // ...其他参数
    }
  }
};
```

**问题分析**：
1. ❌ `prompt` 字段应该是**文本提示**，不是图片URL
2. ❌ 把图片URL作为prompt导致百炼API无法正确解析
3. ❌ 百炼API期望 `prompt` 是字符串类型的文本，而不是URL

---

## ✅ 解决方案

### 正确的API调用格式

**修复后的代码**：
```javascript
const data = {
  input: {
    // ✅ prompt应该是文本提示
    prompt: '请分析这个户型的风水情况',
    // ✅ 图片URL和其他参数放在biz_params中
    biz_params: {
      imageURL: imageUrl,
      area: houseInfo.area || '未填写',
      rooms: houseInfo.rooms || '未填写',
      directions: houseInfo.orientation || '未填写',
      floor: houseInfo.floor || '未填写',
      birth: houseInfo.birthday || '未填写',
      focus: Array.isArray(houseInfo.focusAspects) ? houseInfo.focusAspects.join('、') : '综合分析'
    }
  },
  parameters: {
    incremental_output: false
  }
};
```

### 关键修改点

| 字段 | 修复前 | 修复后 |
|------|--------|--------|
| `input.prompt` | `imageUrl`（图片URL） | `'请分析这个户型的风水情况'`（文本提示） |
| `input.biz_params.imageURL` | `imageUrl` | `imageUrl`（保持不变） |

---

## 🔧 修改文件

**文件**: `cloudfunctions/aiAnalysis/index.js`

**修改的函数**: `callBailianAPI(params)`

**修改位置**: 第216-234行

---

## 📋 百炼应用API格式说明

根据阿里百炼应用API的规范：

### input 字段结构

```javascript
{
  input: {
    prompt: "文本提示",           // 文本类型的提示语
    biz_params: {                 // 业务参数
      imageURL: "图片URL",        // 图片链接
      // ...其他业务参数
    }
  },
  parameters: {
    incremental_output: false     // 是否流式输出
  }
}
```

### 字段说明

1. **`prompt`** (必填)
   - 类型：String
   - 说明：文本提示，告诉AI要做什么
   - 示例：`"请分析这个户型的风水情况"`

2. **`biz_params`** (选填)
   - 类型：Object
   - 说明：业务参数，传递给应用的自定义参数
   - 内容：
     - `imageURL`: 图片URL
     - `area`: 面积
     - `rooms`: 户型
     - `directions`: 朝向
     - `floor`: 楼层
     - `birth`: 生辰
     - `focus`: 关注方面

3. **`parameters`** (选填)
   - 类型：Object
   - 说明：API参数
   - `incremental_output`: 是否流式输出（我们用false）

---

## 🚀 部署步骤

### 1. 部署云函数
在微信开发者工具中：
- 右键 **`cloudfunctions/aiAnalysis`** 文件夹
- 选择 **"上传并部署：云端安装依赖"**
- 等待部署完成 ✅

### 2. 编译前端
- 点击 **"编译"** 按钮

### 3. 测试分析功能
1. 上传户型图
2. 填写户型信息
3. 点击"开始分析"
4. **预期结果**：
   - ✅ 不再出现500错误
   - ✅ 百炼API正常返回分析结果
   - ✅ 前端正常显示分析内容

---

## 📊 请求示例

### 完整的请求数据

```json
{
  "input": {
    "prompt": "请分析这个户型的风水情况",
    "biz_params": {
      "imageURL": "https://636c-cloud1-xxx.tcb.qcloud.la/house_images/xxx.jpg",
      "area": "120",
      "rooms": "三室两厅",
      "directions": "南北朝向",
      "floor": "15",
      "birth": "1990-01-01 08:30 男",
      "focus": "财运、健康"
    }
  },
  "parameters": {
    "incremental_output": false
  }
}
```

### 期望的响应

**成功响应**：
```json
{
  "output": {
    "text": "**户型整体结构**：本户型为三室两厅一厨两卫..."
  },
  "request_id": "xxx-xxx-xxx",
  "usage": {
    "models": [...]
  }
}
```

**失败响应（修复前）**：
```json
{
  "code": "500",
  "message": "Internal Server Error",
  "request_id": "xxx-xxx-xxx"
}
```

---

## 🧪 测试验证

### 测试1：合格户型图
1. 上传带方位标识的清晰户型图
2. 填写户型信息
3. 点击"开始分析"
4. **预期**：返回详细的风水分析结果

### 测试2：不合格图片
1. 上传非户型图（风景、人物等）
2. 点击"开始分析"
3. **预期**：返回"请上传合格的户型图片"提示

### 测试3：云函数日志
在云开发控制台 > 云函数 > aiAnalysis > 日志中查看：

**修复前**：
```
调用百炼API...
图片URL: https://636c-cloud1-xxx.tcb.qcloud.la/house_images/xxx.jpg
百炼API请求参数: {
  "input": {
    "prompt": "https://636c-cloud1-xxx.tcb.qcloud.la/house_images/xxx.jpg",  // ❌ 错误
    "biz_params": {...}
  }
}
❌ 百炼API调用失败: 500 Internal Server Error
```

**修复后**：
```
调用百炼API...
图片URL: https://636c-cloud1-xxx.tcb.qcloud.la/house_images/xxx.jpg
百炼API请求参数: {
  "input": {
    "prompt": "请分析这个户型的风水情况",  // ✅ 正确
    "biz_params": {
      "imageURL": "https://636c-cloud1-xxx.tcb.qcloud.la/house_images/xxx.jpg",
      ...
    }
  }
}
✅ 百炼API调用成功
响应状态: 200
```

---

## ⚠️ 注意事项

### 1. prompt字段的作用
- `prompt` 是告诉AI要执行什么任务的文本指令
- **不要**把图片URL、JSON数据等非文本内容放在prompt中
- **应该**放简洁明确的文本指令

### 2. biz_params的作用
- `biz_params` 是传递给百炼应用的业务参数
- 可以包含图片URL、用户输入的各种数据
- 百炼应用会根据这些参数进行分析

### 3. 与之前版本的兼容性
- 修改后的格式与百炼应用API文档一致
- 如果之前能工作，说明百炼之前可能容错处理了错误格式
- 现在修复为标准格式，更加稳定可靠

---

## 🔄 相关修改历史

### 历史问题
1. **初始版本**：`prompt` 错误地设置为 `"请分析这个户型的风水情况"`（固定文本）
2. **错误修改**：为了传递图片URL，把 `prompt` 改为了 `imageUrl`
3. **当前修复**：恢复 `prompt` 为文本提示，图片URL保持在 `biz_params.imageURL`

### 为什么会出现这个问题
- 之前为了让图片URL能传递到百炼API，错误地把它放在了 `prompt` 字段
- 实际上图片URL一直在 `biz_params.imageURL` 中，不需要在 `prompt` 中重复
- `prompt` 应该保持为文本指令，而不是图片URL

---

## ✅ 验证清单

部署后请验证：

- [ ] 不再出现500错误
- [ ] 云函数日志显示百炼API调用成功（200状态码）
- [ ] 合格户型图能返回详细分析结果
- [ ] 不合格图片能返回"请上传合格的户型图"提示
- [ ] 前端正常显示分析结果
- [ ] 评分和总结都能正确显示

---

## 📝 修改文件清单

- ✅ `cloudfunctions/aiAnalysis/index.js` - 修正 `callBailianAPI` 函数中的 `input.prompt` 字段
- ✅ `BAILIAN_API_500_FIX.md` - 本说明文档

---

完成！现在百炼API应该能正常工作了！🎉


