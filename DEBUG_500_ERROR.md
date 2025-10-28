# 云函数500错误调试指南

## 问题描述

用户点击"开始分析"后出现500错误：
```
aiService.ts:99 创建分析任务失败: Error: Request failed with status code 500
```

## 调试步骤

### 1. 增强错误日志 ✅

已在以下位置添加详细的错误日志：

#### 云函数 (aiAnalysis/index.js)
```javascript
exports.main = async (event, context) => {
  console.log('云函数调用开始，参数:', JSON.stringify(event, null, 2));
  // ... 详细的参数验证和错误处理
}
```

#### 前端服务 (aiService.ts)
```typescript
catch (error) {
  console.error('创建分析任务失败:', error);
  console.error('错误详情:', JSON.stringify(error, null, 2));
  // ... 详细的错误信息提取
}
```

### 2. 创建测试云函数 ✅

创建了 `testAnalysis` 云函数用于基础连接测试：
- 文件: `cloudfunctions/testAnalysis/`
- 功能: 简单的参数回显和状态检查
- 目的: 验证云函数基础调用是否正常

### 3. 使用模拟数据 ✅

暂时禁用外部API调用，使用模拟数据：
```javascript
// 暂时使用模拟数据，先确保基本流程正常
const analysisResult = JSON.stringify({
  "overallScore": 85,
  "aspects": [...],
  "summary": "..."
});
```

## 可能的错误原因

### 1. 环境变量未配置
- `DASHSCOPE_API_KEY` 未设置
- `APP_ID` 未设置
- **解决方案**: 在微信开发者工具中配置云函数环境变量

### 2. 云函数未部署
- `aiAnalysis` 云函数未正确部署
- 依赖包未安装
- **解决方案**: 重新部署云函数并安装依赖

### 3. 参数传递问题
- 前端传递的参数格式不正确
- 必需参数缺失
- **解决方案**: 检查参数验证日志

### 4. 外部API调用失败
- 阿里云百炼API调用超时
- API密钥无效
- 网络连接问题
- **解决方案**: 使用模拟数据测试基础流程

### 5. 数据库操作失败
- 云数据库权限问题
- 集合不存在
- **解决方案**: 检查数据库配置

## 调试流程

### 步骤1: 测试基础云函数调用
```typescript
// 在分析页面中先调用测试云函数
const testResult = await wx.cloud.callFunction({
  name: 'testAnalysis',
  data: { test: '测试数据' }
});
```

### 步骤2: 检查控制台日志
1. 打开微信开发者工具控制台
2. 查看详细的错误日志
3. 检查参数传递是否正确

### 步骤3: 查看云函数日志
1. 在微信开发者工具中打开云开发控制台
2. 查看云函数调用日志
3. 检查具体的错误信息

### 步骤4: 逐步启用功能
1. 先使用模拟数据测试
2. 确认基础流程正常后
3. 再启用外部API调用

## 部署检查清单

### 前端部署
- [ ] 页面代码已更新
- [ ] 错误处理已增强
- [ ] 测试云函数调用已添加

### 云函数部署
- [ ] `testAnalysis` 云函数已部署
- [ ] `aiAnalysis` 云函数已重新部署
- [ ] 依赖包已正确安装
- [ ] 环境变量已配置

### 数据库检查
- [ ] `house_analysis` 集合已创建
- [ ] 数据库权限已配置
- [ ] 索引已创建

## 测试验证

### 1. 基础连接测试
```javascript
// 应该成功返回测试数据
wx.cloud.callFunction({
  name: 'testAnalysis',
  data: { test: 'hello' }
})
```

### 2. 模拟数据测试
```javascript
// 应该返回模拟的分析结果
wx.cloud.callFunction({
  name: 'aiAnalysis',
  data: {
    name: 'createAnalysis',
    imageUrl: '测试户型描述',
    houseInfo: {...},
    userId: 'test_user'
  }
})
```

### 3. 完整流程测试
- 输入户型描述
- 点击开始分析
- 检查返回结果

## 错误排查命令

### 查看云函数列表
```bash
# 在微信开发者工具终端中
wx cloud functions:list
```

### 查看云函数日志
```bash
# 查看最近的调用日志
wx cloud functions:log aiAnalysis
```

### 重新部署云函数
```bash
# 重新部署并安装依赖
wx cloud functions:deploy aiAnalysis --force
```

## 解决方案总结

1. **立即可用**: 使用模拟数据版本，确保基础功能正常
2. **调试信息**: 详细的日志帮助定位具体问题
3. **分步测试**: 从简单到复杂，逐步验证每个环节
4. **错误处理**: 友好的错误提示，提升用户体验

## 下一步行动

1. 部署 `testAnalysis` 和更新的 `aiAnalysis` 云函数
2. 测试基础云函数调用是否正常
3. 查看详细的错误日志
4. 根据日志信息进一步调试
5. 确认基础流程正常后，再启用外部API调用

通过这些调试措施，应该能够快速定位并解决500错误的根本原因。


