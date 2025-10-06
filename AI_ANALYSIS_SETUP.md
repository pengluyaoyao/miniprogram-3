# AI户型分析功能接入指南

## 功能概述

已完成阿里云百炼工作流应用的接入，实现了AI户型风水分析功能。用户可以上传户型图片，填写房屋信息，获得专业的风水分析报告。

## 技术架构

### 1. 云函数 - aiAnalysis
- **文件路径**: `cloudfunctions/aiAnalysis/`
- **功能**: 调用阿里云百炼API进行AI分析
- **支持操作**:
  - `createAnalysis`: 创建分析任务
  - `getAnalysisResult`: 获取分析结果

### 2. 前端服务 - aiService
- **文件路径**: `miniprogram/services/aiService.ts`
- **功能**: 封装AI分析相关的前端逻辑
- **主要方法**:
  - `uploadImage()`: 上传图片到云存储
  - `createAnalysis()`: 创建分析任务
  - `getAnalysisResult()`: 获取分析结果
  - `chooseImage()`: 选择图片
  - `validateHouseInfo()`: 验证户型信息

### 3. 分析页面更新
- **页面路径**: `miniprogram/pages/analysis/`
- **新增功能**:
  - 图片上传和预览
  - 房间数和楼层信息输入
  - AI分析结果展示
  - 综合评分显示

## 部署步骤

### 1. 配置环境变量

在微信开发者工具中，为 `aiAnalysis` 云函数配置环境变量：

```json
{
  "DASHSCOPE_API_KEY": "你的阿里云百炼API密钥",
  "APP_ID": "你的百炼应用ID"
}
```

### 2. 部署云函数

1. 在微信开发者工具中右键点击 `cloudfunctions/aiAnalysis` 文件夹
2. 选择"创建并部署：云端安装依赖"
3. 等待部署完成

### 3. 初始化数据库

确保 `house_analysis` 集合已创建，可以通过 `initDatabase` 云函数初始化。

## 使用流程

### 1. 用户操作流程
1. 打开"分析"页面
2. 点击上传户型图片
3. 填写房屋基本信息：
   - 生辰八字
   - 房屋朝向
   - 房屋面积
   - 房间数
   - 楼层信息
4. 选择关注方面（财位、主卧、厨房等）
5. 点击"开始分析"按钮
6. 等待AI分析完成
7. 查看分析结果

### 2. 分析结果包含
- **综合评分**: 1-100分的总体评价
- **分项分析**: 各个方面的详细分析
  - 分析内容
  - 单项评分
  - 改善建议
- **分析总结**: 整体建议和总结

## 数据结构

### 户型信息 (HouseInfo)
```typescript
interface HouseInfo {
  area: string;          // 面积
  rooms: string;         // 房间数
  orientation: string;   // 朝向
  floor: string;         // 楼层
  totalFloors: string;   // 总楼层
  birthday: string;      // 生辰信息
  focusAspects: string[]; // 关注方面
}
```

### 分析结果 (AnalysisResult)
```typescript
interface AnalysisResult {
  overallScore: number;  // 综合评分
  aspects: AnalysisAspect[]; // 分项分析
  summary: string;       // 总结
}

interface AnalysisAspect {
  type: string;         // 类型
  title: string;        // 标题
  content: string;      // 内容
  score: number;        // 评分
  suggestions: string[]; // 建议
  color: string;        // 颜色
}
```

## API调用示例

### 云函数调用
```javascript
// 创建分析任务
const result = await wx.cloud.callFunction({
  name: 'aiAnalysis',
  data: {
    name: 'createAnalysis',
    imageUrl: 'cloud://xxx.jpg',
    houseInfo: {
      area: '98',
      rooms: '3室2厅',
      orientation: '南',
      floor: '15',
      totalFloors: '32',
      birthday: '1990-01-01 08:30 男',
      focusAspects: ['财位', '厨房']
    },
    userId: 'user123'
  }
});
```

### 前端服务调用
```typescript
// 使用aiService
import { aiService } from '../../services/aiService';

// 上传图片
const imageUrl = await aiService.uploadImage(tempFilePath);

// 创建分析
const result = await aiService.createAnalysis(imageUrl, houseInfo);
```

## 错误处理

### 常见错误及解决方案

1. **环境变量未配置**
   - 错误: `缺少必要的环境变量配置`
   - 解决: 检查云函数环境变量配置

2. **API调用失败**
   - 错误: `API调用失败: 401`
   - 解决: 检查API密钥是否正确

3. **图片上传失败**
   - 错误: `图片上传失败`
   - 解决: 检查云存储权限和网络连接

4. **用户信息缺失**
   - 错误: `用户未登录`
   - 解决: 确保用户已登录

## 性能优化

### 1. 云函数优化
- 设置60秒超时时间，适应AI分析耗时
- 使用axios进行HTTP请求，支持超时控制
- 错误处理和重试机制

### 2. 前端优化
- 图片压缩上传，减少传输时间
- 分析过程显示加载状态
- 结果缓存，避免重复分析

### 3. 用户体验
- 实时表单验证
- 友好的错误提示
- 分析结果可视化展示

## 扩展功能

### 可扩展的功能点
1. **分析历史**: 查看历史分析记录
2. **分享功能**: 分享分析结果到社区
3. **专家咨询**: 连接真人风水师
4. **个性化建议**: 基于用户偏好的建议
5. **3D户型**: 支持3D户型图分析

## 注意事项

1. **API配额**: 注意阿里云百炼API的调用配额限制
2. **数据安全**: 用户上传的图片和信息需要妥善保护
3. **结果准确性**: AI分析结果仅供参考，建议添加免责声明
4. **成本控制**: 监控API调用成本，设置合理的使用限制

## 测试验证

### 功能测试清单
- [ ] 图片上传功能
- [ ] 表单验证功能
- [ ] AI分析调用
- [ ] 结果展示功能
- [ ] 错误处理机制
- [ ] 用户体验流程

### 测试数据
可以使用以下测试数据进行功能验证：
- 面积: 98平方米
- 房间: 3室2厅
- 朝向: 南
- 楼层: 15/32
- 生辰: 1990-01-01 08:30 男
- 关注: 财位、厨房

## 部署完成

AI户型分析功能已完全集成，包括：
✅ 阿里云百炼API接入
✅ 图片上传和管理
✅ 户型信息收集
✅ AI分析结果展示
✅ 错误处理和用户体验优化

用户现在可以通过"分析"页面体验完整的AI户型风水分析功能。

