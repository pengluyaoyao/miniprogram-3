# AI 分析功能部署检查清单

## ✅ 代码修改完成

以下文件已更新，可以直接部署：

- [x] `cloudfunctions/aiAnalysis/index.js` - 采用百炼工作流格式
- [x] `miniprogram/services/aiService.ts` - AI 服务接口
- [x] `miniprogram/pages/analysis/analysis.ts` - 优化用户体验
- [x] `cloudfunctions.json` - 超时配置 120 秒

## 📋 部署前检查

### 1. 环境变量配置

在**微信云开发控制台**配置环境变量：

```
DASHSCOPE_API_KEY = sk-xxxxxxxxxxxxxxxx
APP_ID = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**获取方式**:
- 登录 [阿里云百炼控制台](https://bailian.console.aliyun.com/)
- API-KEY 管理 → 创建/复制 API Key
- 工作流应用详情 → 复制应用 ID

### 2. 阿里云百炼工作流配置

在百炼控制台创建/编辑工作流应用：

#### 输入参数配置

**必需配置**:
- ✅ `prompt` (String) - 主输入
- ✅ `biz_params` (Object) - 包含以下字段：
  - `imageURL` - 户型描述
  - `area` - 面积
  - `rooms` - 房间数
  - `directions` - 朝向
  - `floor` - 楼层
  - `birth` - 生辰
  - `focus` - 关注方面

#### LLM 节点配置

在 Prompt 模板中引用参数：
```
${prompt}
${biz_params.area}
${biz_params.rooms}
...
```

### 3. 云函数部署

在**微信开发者工具**中：

1. 右键点击 `cloudfunctions/aiAnalysis`
2. 选择 "**上传并部署：云端安装依赖**"
3. 等待部署完成（约 1-2 分钟）

### 4. 验证部署

#### 云函数配置验证

在云开发控制台查看：
- 超时时间: **120 秒** ✅
- 内存: **256 MB** ✅
- 环境变量: **已配置** ✅

#### 功能测试

1. 打开小程序分析页面
2. 输入户型描述
3. 点击"开始分析"
4. 等待 30-60 秒
5. 查看分析结果

## 🔍 常见问题排查

### 问题 1: 超时错误 (433)

**检查项**:
- [ ] 云函数超时配置是否为 120 秒
- [ ] 云函数是否重新部署
- [ ] 网络连接是否正常

**解决**: 参考 `TIMEOUT_FIX.md`

### 问题 2: API 调用失败 (401)

**检查项**:
- [ ] DASHSCOPE_API_KEY 是否正确
- [ ] API Key 是否过期
- [ ] 阿里云账户余额是否充足

**解决**: 重新生成 API Key

### 问题 3: 参数接收失败

**检查项**:
- [ ] 工作流应用是否配置了 biz_params
- [ ] APP_ID 是否正确
- [ ] 工作流应用是否已发布

**解决**: 参考 `BAILIAN_WORKFLOW_CONFIG.md`

### 问题 4: 返回结果格式错误

**检查项**:
- [ ] 工作流 LLM 节点是否要求返回 JSON
- [ ] 输出节点是否正确配置

**解决**: 调整工作流配置，明确返回格式要求

## 📊 测试用例

### 测试用例 1: 基本功能

**输入**:
```
户型描述: 三室两厅，南北通透
面积: 120平米
朝向: 南北朝向
```

**预期**: 成功返回分析结果，包含 overallScore 和 aspects

### 测试用例 2: 最小输入

**输入**:
```
户型描述: 两室一厅
其他字段: 未填写
```

**预期**: 成功分析，使用默认值

### 测试用例 3: 完整输入

**输入**:
```
户型描述: 详细的户型描述...
面积: 150平米
房间: 4室2厅
朝向: 南北朝向
楼层: 10/30
生辰: 1990-01-01
关注: 财位、主卧、厨房
```

**预期**: 返回详细的多维度分析

## 📈 性能指标

### 目标指标

- **响应时间**: < 60 秒（平均）
- **成功率**: > 95%
- **错误率**: < 5%

### 监控方式

在云开发控制台查看：
- 调用次数统计
- 平均执行时间
- 错误日志

## 🚀 部署步骤总结

```bash
# 1. 配置阿里云百炼
登录百炼控制台 → 创建工作流应用 → 配置参数

# 2. 配置环境变量
云开发控制台 → 云函数 → 环境变量 → 添加配置

# 3. 部署云函数
微信开发者工具 → 右键 aiAnalysis → 上传并部署

# 4. 测试功能
小程序分析页面 → 输入信息 → 开始分析 → 查看结果

# 5. 查看日志
云开发控制台 → 云函数日志 → 查看执行情况
```

## 📞 技术支持

### 文档参考

- `TIMEOUT_FIX.md` - 超时问题解决
- `BAILIAN_WORKFLOW_CONFIG.md` - 工作流配置
- `BAILIAN_API_UPDATE.md` - API 参数说明

### 在线资源

- [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [阿里云百炼控制台](https://bailian.console.aliyun.com/)
- [百炼帮助文档](https://help.aliyun.com/zh/model-studio/)

### 联系方式

如遇到问题，可以：
1. 查看云函数日志
2. 参考相关文档
3. 联系阿里云技术支持

---

**更新时间**: 2025-10-03  
**版本**: v1.0

