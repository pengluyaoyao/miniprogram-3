# 订阅消息功能使用指南

## 功能说明

用户在提交户型图分析后，可以：
1. ✅ 先离开小程序去做其他事情
2. ✅ 分析完成后收到微信订阅消息通知
3. ✅ 点击消息直接跳转回小程序查看分析结果

## 已实现的功能

### 1. 前端部分 (`miniprogram/pages/analysis/analysis.ts`)

#### 订阅消息授权
在用户点击"开始分析"时，会先请求订阅消息授权：
```typescript
await wx.requestSubscribeMessage({
  tmplIds: ['0hz_amBSAdeRaNhLI0u832OhnPR0Qcl9vF03Ec5jIRE']
});
```

#### 消息跳转处理
页面加载时检查是否从消息进入（带 `taskId` 参数）：
```typescript
onLoad(options: any) {
  if (options && options.taskId) {
    this.loadAnalysisResult(options.taskId);  // 自动加载历史结果
  }
}
```

### 2. 云函数部分 (`cloudfunctions/aiAnalysis/index.js`)

#### 保存用户 openid
创建任务时自动获取并保存用户的 openid：
```javascript
const wxContext = cloud.getWXContext();
const openid = wxContext.OPENID;
```

#### 发送订阅消息
分析完成后自动发送订阅消息：
```javascript
await cloud.openapi.subscribeMessage.send({
  touser: openid,
  page: `pages/analysis/analysis?taskId=${taskId}`,
  templateId: '0hz_amBSAdeRaNhLI0u832OhnPR0Qcl9vF03Ec5jIRE'
});
```

## 订阅消息模板配置

### 当前使用的模板信息
- **模板ID**: `0hz_amBSAdeRaNhLI0u832OhnPR0Qcl9vF03Ec5jIRE`
- **字段说明**:
  - `thing1`: 事项名称（户型风水分析）
  - `time2`: 完成时间
  - `thing3`: 备注信息（您的户型分析已完成，点击查看）

### 在小程序后台配置
1. 登录微信公众平台：https://mp.weixin.qq.com
2. 进入「功能」→「订阅消息」
3. 确认模板 `0hz_amBSAdeRaNhLI0u832OhnPR0Qcl9vF03Ec5jIRE` 已启用

## 完整流程示意

```
1. 用户点击"开始分析"
   ↓
2. 弹出订阅消息授权弹窗
   ↓
3. 用户同意授权（或拒绝）
   ↓
4. 提交分析任务到云端
   ↓
5. 显示"分析中..."（用户可以离开小程序）
   ↓
6. 云函数后台处理分析
   ↓
7. 分析完成，发送订阅消息
   ↓
8. 用户收到微信服务通知
   ↓
9. 用户点击消息
   ↓
10. 跳转回小程序，自动加载分析结果
```

## 注意事项

### 1. 订阅消息授权规则
- ⚠️ 每次授权只能发送**一次**消息
- ⚠️ 用户可以选择拒绝授权（不影响分析功能）
- ⚠️ 即使用户拒绝，分析仍会正常进行

### 2. 消息发送时机
- ✅ 只在分析**完成**时发送
- ✅ 分析失败时**不会**发送消息
- ✅ 如果用户没有授权，不会发送（不报错）

### 3. 环境配置

**开发环境** (当前配置):
```javascript
miniprogramState: 'developer'  // 开发版
```

**正式发布时**，需要修改为：
```javascript
miniprogramState: 'formal'  // 正式版
```

修改位置：`cloudfunctions/aiAnalysis/index.js` 第 369 行

## 测试步骤

### 开发环境测试
1. 确保云函数已部署最新版本
2. 在小程序开发工具中打开项目
3. 上传户型图并点击"开始分析"
4. 同意订阅消息授权
5. 可以关闭或切换小程序
6. 等待分析完成（约 10-30 秒）
7. 查看是否收到微信服务通知
8. 点击通知，应该跳转回小程序并显示结果

### 云函数日志检查
在云开发控制台查看日志，应该能看到：
```
用户openid: oXXXX-XXXXXXX
准备发送订阅消息: { openid: 'oXXXX-XXXXXXX', taskId: 'xxx' }
订阅消息发送成功
```

## 常见问题

### Q1: 用户收不到消息？
**可能原因**:
- 用户拒绝了订阅授权
- 小程序后台模板未启用
- 云函数权限不足（需要开通 `openapi` 权限）

### Q2: 消息发送失败？
**检查项**:
1. 模板ID是否正确
2. 字段值是否符合长度限制（`thing` 类型最多 20 个字符）
3. 云函数是否有 `openapi` 调用权限

### Q3: 点击消息无法跳转？
**检查项**:
1. `page` 路径是否正确（不需要加 `/`）
2. `taskId` 参数是否正确传递
3. 页面是否在 `app.json` 中注册

## 云函数权限配置

确保云函数有调用 `openapi` 的权限：

1. 进入云开发控制台
2. 选择云函数 `aiAnalysis`
3. 点击「权限设置」
4. 确保已开通「服务端调用」权限

## 正式发布前检查清单

- [ ] 修改 `miniprogramState` 为 `'formal'`
- [ ] 确认订阅消息模板已发布（非草稿状态）
- [ ] 测试完整流程（从授权到接收消息）
- [ ] 检查云函数日志无错误
- [ ] 确认消息内容符合要求

---

## 技术实现细节

### 数据库字段新增
在 `house_analysis` 集合中新增字段：
- `openid`: 用户的唯一标识，用于发送订阅消息

### 不改变原有逻辑
- ✅ 保持原有的分析流程不变
- ✅ 订阅消息作为额外功能，不影响主流程
- ✅ 即使发送失败，也不影响分析结果保存

### 兼容性
- ✅ 支持老用户数据（没有 openid 的记录）
- ✅ 用户拒绝授权也能正常使用
- ✅ 发送失败不影响核心功能



