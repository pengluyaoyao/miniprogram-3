# 快速部署指南

## 🚀 一键部署所有云函数

### 方法一：批量部署（推荐）

1. **在微信开发者工具中**：
   - 右键点击 `cloudfunctions` 文件夹
   - 选择 **"创建并部署：云端安装依赖"**
   - 等待部署完成（大约需要2-3分钟）

### 方法二：逐个部署

如果批量部署失败，可以逐个部署：

1. **部署用户相关云函数**：
   ```
   cloudfunctions/userLogin/          ✅ 用户登录
   cloudfunctions/phoneLogin/         ✅ 手机号登录
   cloudfunctions/getPhoneNumber/     ✅ 获取手机号
   cloudfunctions/sendSmsCode/        ✅ 发送短信
   cloudfunctions/updateUserInfo/     ✅ 更新用户信息
   cloudfunctions/updateUserStats/    ✅ 更新用户统计
   cloudfunctions/deleteOldAvatar/    ✅ 删除旧头像
   ```

2. **部署系统云函数**：
   ```
   cloudfunctions/initDatabase/       ✅ 初始化数据库
   ```

### 方法三：命令行部署（如果支持）

```bash
# 进入项目目录
cd /Users/pengluyao/WeChatProjects/miniprogram-3

# 部署所有云函数
npm run deploy:cloud

# 或者使用微信开发者工具CLI
tcb functions:deploy --all
```

## 🔍 验证部署

### 1. 检查云开发控制台
- 进入微信云开发控制台
- 查看 **"云函数"** 页面
- 确认所有函数都显示为 **"运行中"** 状态

### 2. 测试云函数
在云开发控制台中测试 `deleteOldAvatar` 云函数：
```javascript
// 测试数据
{
  "oldAvatarUrl": "cloud://test.746c-test-123456/avatars/test.jpg"
}
```

### 3. 检查函数日志
- 查看云函数调用日志
- 确认没有错误信息

## 🎯 部署后的功能

### ✅ 完整功能
- 用户登录/注册
- 头像上传
- 自动删除旧头像
- 用户信息管理

### ⚠️ 临时功能（如果云函数未部署）
- 用户登录/注册
- 头像上传
- ❌ 自动删除旧头像（需要手动清理）

## 🆘 如果部署失败

### 常见解决方案

1. **网络问题**：
   - 检查网络连接
   - 重试部署

2. **权限问题**：
   - 检查云开发权限
   - 确认环境ID正确

3. **代码问题**：
   - 检查云函数代码语法
   - 查看错误日志

### 临时解决方案

如果云函数部署失败，头像上传功能仍然可以正常工作，只是不会自动删除旧头像文件。

## 📞 技术支持

如果遇到问题，可以：
1. 查看云开发控制台错误日志
2. 检查微信开发者工具控制台
3. 参考微信云开发官方文档
