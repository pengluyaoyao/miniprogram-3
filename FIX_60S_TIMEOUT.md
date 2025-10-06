# 修复60秒超时问题

## 当前状态

- 配置文件设置：**120秒**
- 实际生效：**60秒** ⚠️
- 阿里云API耗时：可能超过60秒

## 🚀 解决方案

### 方案一：在云控制台直接修改（推荐）⭐

1. **打开云开发控制台**
   - 访问：https://console.cloud.tencent.com/tcb
   - 选择你的环境

2. **修改云函数配置**
   - 点击"云函数" → 找到 `aiAnalysis`
   - 点击"函数配置" → 点击"编辑"
   - **执行超时时间**：修改为 **180 秒**（3分钟）
   - **运行内存**：修改为 **512 MB**
   - 点击"保存"

3. **验证配置**
   - 刷新页面确认超时时间已更新
   - 重新测试功能

### 方案二：使用异步调用模式

如果平台限制最大60秒，改用异步处理：

**原理**：
```
前端请求 → 云函数接收 → 返回"分析中"
            ↓
        后台异步调用百炼API
            ↓
        完成后保存到数据库
            ↓
前端轮询查询结果
```

### 方案三：优化API调用（临时措施）

减少阿里云百炼的处理时间：

1. **简化 prompt**
2. **减少分析维度**
3. **使用更快的模型**

## 📊 对比分析

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| 控制台修改 | 简单快速 | 可能有平台限制 | ⭐⭐⭐⭐⭐ |
| 异步模式 | 突破限制 | 需要改造代码 | ⭐⭐⭐⭐ |
| 优化调用 | 快速响应 | 功能受限 | ⭐⭐⭐ |

## 🎯 立即操作

### 步骤1：尝试修改到180秒

```bash
# 在云开发控制台
云函数 → aiAnalysis → 函数配置 → 编辑
执行超时时间: 180 秒
运行内存: 512 MB
```

### 步骤2：如果平台限制60秒

那就需要改用异步模式（见下方详细说明）

### 步骤3：测试验证

```javascript
// 查看云函数日志，记录实际执行时间
console.log('API调用开始:', new Date());
// ... API调用
console.log('API调用完成:', new Date());
console.log('耗时:', endTime - startTime, 'ms');
```

## 🔧 如果需要异步模式

修改云函数，改为两步处理：

### 第一步：创建任务

```javascript
// 接收请求后立即返回
const taskId = generateTaskId();
await db.collection('analysis_tasks').add({
  data: {
    taskId,
    status: 'pending',
    houseInfo,
    createTime: new Date()
  }
});

// 立即返回任务ID
return {
  success: true,
  taskId: taskId,
  message: '分析任务已创建，请稍后查询结果'
};

// 异步调用百炼API（不等待结果）
processAnalysis(taskId, houseInfo).catch(err => {
  console.error('异步处理失败:', err);
});
```

### 第二步：查询结果

```javascript
// 前端轮询查询
setInterval(async () => {
  const result = await aiService.getTaskResult(taskId);
  if (result.status === 'completed') {
    // 显示结果
    clearInterval(timer);
  }
}, 3000); // 每3秒查询一次
```

## 📝 详细实现（异步模式）

如果确认需要异步模式，我可以帮你修改代码。这包括：

1. **云函数改造**
   - 添加任务队列
   - 实现异步处理
   - 添加状态查询接口

2. **前端改造**
   - 轮询查询机制
   - 进度显示
   - 结果通知

3. **数据库**
   - 创建任务表
   - 记录处理状态

## ⚡ 快速测试脚本

```javascript
// 在云函数中添加计时
const startTime = Date.now();

// 调用百炼API
const response = await axios.post(url, data, {
  // ...
});

const endTime = Date.now();
const duration = (endTime - startTime) / 1000;

console.log(`百炼API耗时: ${duration} 秒`);

// 如果 duration > 50 秒，说明需要异步模式
if (duration > 50) {
  console.warn('API耗时过长，建议使用异步模式');
}
```

## 🎬 下一步行动

### 立即执行（5分钟）

1. ✅ 打开云开发控制台
2. ✅ 修改超时时间为 **180秒**
3. ✅ 修改内存为 **512MB**
4. ✅ 保存配置
5. ✅ 重新测试

### 如果还是60秒限制

告诉我结果，我会帮你：
1. 实现异步处理模式
2. 优化API调用
3. 添加进度显示

## 📞 需要帮助？

如果云控制台无法修改到180秒，立即告诉我，我会提供异步模式的完整代码实现。

