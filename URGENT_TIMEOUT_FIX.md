# ⚠️ 紧急修复：3秒超时问题

## 问题现象

```
Invoking task timed out after 3 seconds
FUNCTIONS_TIME_LIMIT_EXCEEDED
```

## 根本原因

**云函数配置已修改为 120 秒，但云端仍在使用旧的 3 秒配置！**

需要重新部署云函数才能使新配置生效。

## 🚀 立即修复（三种方法）

### 方法 1：微信开发者工具（推荐）⭐

1. **打开微信开发者工具**
2. **找到云函数目录**：`cloudfunctions/aiAnalysis`
3. **右键点击** `aiAnalysis` 文件夹
4. **选择**："上传并部署：云端安装依赖"
5. **等待部署完成**（约 1-2 分钟）
6. **验证**：在云开发控制台查看云函数配置

### 方法 2：命令行部署

```bash
# 进入云函数目录
cd cloudfunctions/aiAnalysis

# 安装依赖（如果还没安装）
npm install

# 使用 tcb CLI 部署（需要先安装 cloudbase-cli）
npm install -g @cloudbase/cli
tcb login
tcb functions:deploy aiAnalysis --timeout 120
```

### 方法 3：云开发控制台

1. 打开 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb)
2. 进入你的环境 → 云函数
3. 找到 `aiAnalysis` 函数
4. 点击"函数配置" → 编辑
5. **执行超时时间**：修改为 **120 秒**
6. **内存配置**：修改为 **256 MB**
7. 保存配置

## ✅ 验证部署

### 1. 检查云函数配置

在云开发控制台查看 `aiAnalysis` 云函数：

```
执行超时时间: 120 秒 ✅
内存: 256 MB ✅
运行时: Nodejs 18.15 ✅
```

### 2. 查看部署日志

微信开发者工具 → 控制台 → 云开发 → 部署日志

应该看到：
```
上传云函数 aiAnalysis 成功
配置更新成功
```

### 3. 测试功能

重新测试 AI 分析功能：
1. 打开小程序分析页面
2. 输入户型描述
3. 点击"开始分析"
4. **等待最多 2 分钟**
5. 查看是否成功返回结果

## 🔍 如果仍然失败

### 检查项 1: 环境变量是否配置

云开发控制台 → 云函数 → aiAnalysis → 环境变量：

```
DASHSCOPE_API_KEY = sk-xxxxx... ✅
APP_ID = xxxxx-xxxx-xxxx... ✅
```

**如果没有配置**：
1. 点击"编辑"
2. 添加这两个环境变量
3. 保存后重新部署云函数

### 检查项 2: 云函数代码是否最新

查看 `cloudfunctions/aiAnalysis/index.js` 第 105-111 行：

```javascript
const response = await axios.post(url, data, {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  timeout: 90000  // 应该是 90000 (90秒)
});
```

**如果不是 90000**：需要重新上传代码

### 检查项 3: 阿里云 API 是否正常

测试 API 是否可以访问：

```bash
curl -X POST https://dashscope.aliyuncs.com/api/v1/apps/YOUR_APP_ID/completion \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "prompt": "测试",
      "biz_params": {}
    }
  }'
```

## 📊 部署后的配置确认

| 配置项 | 修改前 | 修改后 | 状态 |
|--------|--------|--------|------|
| 云函数超时 | 3秒 | **120秒** | ⚠️ 需部署 |
| HTTP 超时 | 30秒 | **90秒** | ⚠️ 需部署 |
| 内存配置 | 128MB | **256MB** | ⚠️ 需部署 |
| 前端体验 | 无提示 | **加载提示** | ✅ 已完成 |

## 🎯 关键提醒

### ⚠️ 重要！

**修改配置文件后必须重新部署云函数！**

配置文件只是本地配置，不会自动同步到云端。必须通过以下任一方式部署：
- 微信开发者工具上传
- 命令行 CLI 部署
- 云开发控制台直接修改

### ⏱️ 超时层级

```
用户等待时间: 2 分钟（用户体验）
    ↓
云函数超时: 120 秒（云函数配置）
    ↓
HTTP 超时: 90 秒（Axios 配置）
    ↓
API 处理时间: 10-60 秒（实际耗时）
```

## 🐛 调试技巧

### 查看实时日志

```bash
# 在云开发控制台实时查看日志
云函数 → aiAnalysis → 日志 → 实时日志
```

观察以下信息：
1. **函数开始执行** - 确认函数被调用
2. **调用百炼API** - 确认请求发出
3. **API响应数据** - 确认收到响应
4. **执行时间** - 查看实际耗时

### 常见错误信息

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| Timeout after 3s | 配置未生效 | 重新部署云函数 |
| 401 Unauthorized | API Key 错误 | 检查环境变量 |
| 404 Not Found | App ID 错误 | 检查环境变量 |
| Network Error | 网络问题 | 检查云函数网络 |

## 📞 紧急支持

如果按照上述步骤仍无法解决：

1. **截图保存**：
   - 云函数配置页面
   - 部署日志
   - 错误信息

2. **导出日志**：
   - 云开发控制台的完整日志
   - 微信开发者工具控制台日志

3. **检查清单**：
   - [ ] cloudfunctions.json 中 timeout 是否为 120
   - [ ] 云函数是否重新部署
   - [ ] 云开发控制台显示的超时时间是否为 120
   - [ ] 环境变量是否已配置
   - [ ] 阿里云 API Key 是否有效

## 🎬 完整部署流程演示

```bash
# 1. 确认配置正确
cat cloudfunctions.json | grep -A 8 "aiAnalysis"

# 输出应该包含:
# "timeout": 120

# 2. 在微信开发者工具中部署
# 右键 cloudfunctions/aiAnalysis → 上传并部署：云端安装依赖

# 3. 等待部署完成
# 查看控制台输出：
# ✓ 云函数 aiAnalysis 上传成功
# ✓ 云函数配置更新成功

# 4. 验证配置
# 打开云开发控制台 → 云函数 → aiAnalysis → 配置
# 确认：执行超时时间 = 120 秒

# 5. 测试功能
# 打开小程序 → 分析页面 → 输入描述 → 开始分析
# 等待结果（可能需要 30-60 秒）
```

---

**更新时间**: 2025-10-03  
**紧急程度**: ⚠️ 高  
**必须操作**: 重新部署云函数

