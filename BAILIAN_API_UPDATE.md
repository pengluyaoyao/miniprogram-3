# 阿里百炼API参数映射更新

## 更新日期
2025-10-03

## 更新内容

### 阿里云百炼工作流传参格式

云函数 `aiAnalysis` 已更新为阿里云百炼工作流模式，使用标准的 `prompt` + `biz_params` 传参格式。

### API 调用结构

```javascript
{
  input: {
    prompt: "户型描述内容",  // imageURL 作为 prompt 传递
    biz_params: {
      // 业务参数
      imageURL: "户型描述内容",
      area: "面积",
      rooms: "房间数",
      directions: "朝向",
      floor: "楼层",
      birth: "生辰",
      focus: "关注方面"
    }
  },
  parameters: {},
  debug: {}
}
```

### 参数映射关系

| 字段位置 | 参数名 | 云函数参数来源 | 说明 |
|---------|-------|--------------|------|
| `input.prompt` | - | `imageUrl` (houseDescription) | 主要输入内容 |
| `input.biz_params` | `imageURL` | `imageUrl` (houseDescription) | 户型描述文本 |
| `input.biz_params` | `area` | `houseInfo.area` | 房屋面积 |
| `input.biz_params` | `rooms` | `houseInfo.rooms` | 房间数量 |
| `input.biz_params` | `directions` | `houseInfo.orientation` | 房屋朝向 |
| `input.biz_params` | `floor` | `houseInfo.floor` + `totalFloors` | 楼层（格式：5/20） |
| `input.biz_params` | `birth` | `houseInfo.birthday` | 生辰信息 |
| `input.biz_params` | `focus` | `houseInfo.focusAspects` | 关注方面（顿号分隔） |

### 主要修改

1. **删除了 `buildAnalysisPrompt` 函数**
   - 不再使用 prompt 构建方式
   - 改为工作流标准格式

2. **采用工作流传参格式**
   ```javascript
   const data = {
     input: {
       prompt: houseDescription,  // imageURL 作为 prompt 内容
       biz_params: {
         imageURL: houseDescription,
         area: houseInfo.area || '未填写',
         rooms: houseInfo.rooms || '未填写',
         directions: houseInfo.orientation || '未填写',
         floor: floorInfo,  // 合并了 floor 和 totalFloors
         birth: houseInfo.birthday || '未填写',
         focus: Array.isArray(houseInfo.focusAspects) 
           ? houseInfo.focusAspects.join('、') 
           : '综合分析'
       }
     },
     parameters: {},
     debug: {}
   };
   ```

3. **楼层信息处理**
   - 如果提供了 `totalFloors`，格式为 "楼层/总楼层"（例如："5/20"）
   - 如果没有提供 `totalFloors`，只显示楼层数（例如："5"）

4. **focusAspects 处理**
   - 将数组转换为顿号（、）分隔的字符串
   - 例如：["财位", "主卧", "厨房"] → "财位、主卧、厨房"

### 前端无需修改

前端代码无需修改，继续使用相同的参数结构：

```typescript
const houseInfo: HouseInfo = {
  area: formData.area || '未填写',
  rooms: formData.rooms || '未填写',
  orientation: formData.orientation || '未填写',
  floor: formData.floor || '未填写',
  totalFloors: formData.totalFloors || '未填写',
  birthday: formData.birthInfo || '未填写',
  focusAspects: selectedFocus.length > 0 ? selectedFocus : ['综合分析']
};
```

### 部署说明

修改完成后，需要重新部署 `aiAnalysis` 云函数：

```bash
# 在微信开发者工具中
1. 右键点击 cloudfunctions/aiAnalysis
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成
```

### 测试建议

1. 确认阿里百炼应用已配置接收这些变量
2. 测试不同参数组合的情况
3. 验证返回结果格式是否符合预期
4. 检查日志输出，确认参数正确传递

### 相关文件

- `/cloudfunctions/aiAnalysis/index.js` - 云函数主文件
- `/miniprogram/services/aiService.ts` - 前端服务文件
- `/miniprogram/pages/analysis/analysis.ts` - 分析页面

