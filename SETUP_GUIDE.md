# 小程序数据库和云存储设置指南

## 🚀 快速开始

### 第一步：部署云函数
1. 在微信开发者工具中打开项目
2. 右键点击 `cloudfunctions` 文件夹
3. 选择 **"创建并部署：云端安装依赖"**
4. 等待所有云函数部署完成

### 第二步：初始化数据库
1. 在微信开发者工具中，点击 **"云开发"** 按钮
2. 进入 **"云函数"** 页面
3. 找到 `initDatabase` 云函数
4. 点击 **"测试"** 按钮
5. 点击 **"调用云函数"**
6. 等待执行完成，查看返回结果

### 第三步：配置数据库权限
在云开发控制台的数据库页面，为每个集合配置权限：

#### 用户集合 (users)
```json
{
  "read": "auth.openid == resource._openid",
  "write": "auth.openid == resource._openid"
}
```

#### 帖子集合 (posts)
```json
{
  "read": true,
  "write": "auth.openid == resource._openid"
}
```

#### 评论集合 (comments)
```json
{
  "read": true,
  "write": "auth.openid == resource._openid"
}
```

#### 其他集合 (house_analysis, collections, likes, notifications)
```json
{
  "read": "auth.openid == resource._openid",
  "write": "auth.openid == resource._openid"
}
```

#### 短信验证码集合 (sms_codes)
```json
{
  "read": false,
  "write": false
}
```

### 第四步：配置云存储权限
在云开发控制台的存储页面，配置文件夹权限：

#### avatars/ (用户头像)
```json
{
  "read": true,
  "write": "auth.openid != null"
}
```

#### house-images/ (户型图片)
```json
{
  "read": true,
  "write": "auth.openid != null"
}
```

#### post-images/ (帖子图片)
```json
{
  "read": true,
  "write": "auth.openid != null"
}
```

#### comment-images/ (评论图片)
```json
{
  "read": true,
  "write": "auth.openid != null"
}
```

## 📊 数据集合说明

### 必需的数据集合（8个）

1. **users** - 用户信息
2. **sms_codes** - 短信验证码（临时）
3. **house_analysis** - 户型分析记录
4. **posts** - 社区帖子
5. **comments** - 帖子评论
6. **collections** - 用户收藏
7. **likes** - 点赞记录
8. **notifications** - 消息通知

### 云存储文件夹（自动创建）

1. **avatars/** - 用户头像
2. **house-images/** - 户型图片
3. **post-images/** - 帖子图片
4. **comment-images/** - 评论图片

## ✅ 验证设置

### 检查数据库
1. 进入云开发控制台 → 数据库
2. 确认所有8个集合都已创建
3. 检查每个集合的权限配置

### 检查云存储
1. 进入云开发控制台 → 存储
2. 文件夹会在首次上传时自动创建
3. 检查权限配置

### 测试功能
1. 在小程序中测试微信登录
2. 测试头像上传功能
3. 测试户型分析功能

## 🔧 常见问题

### Q: 云函数部署失败
A: 检查网络连接，确保微信开发者工具版本最新

### Q: 数据库集合创建失败
A: 检查云开发环境是否正确配置，环境ID是否匹配

### Q: 权限配置错误
A: 仔细检查权限规则语法，确保JSON格式正确

### Q: 文件上传失败
A: 检查云存储权限配置，确保用户有写入权限

## 📝 注意事项

1. **环境ID**: 确保使用正确的云开发环境ID `cloud1-2grdaeu00966fc03`
2. **权限安全**: 不要给予过高的权限，遵循最小权限原则
3. **索引优化**: 数据量大时，考虑添加更多索引优化查询性能
4. **备份**: 定期备份重要数据
5. **监控**: 关注云函数调用量和数据库读写次数

## 🎯 下一步

设置完成后，你可以：
1. 测试用户登录注册功能
2. 测试户型分析功能
3. 开发社区功能（帖子、评论、点赞）
4. 添加消息通知功能
5. 优化性能和用户体验
