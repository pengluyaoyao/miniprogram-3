# 数据库设计和云存储结构

## 1. 云数据库集合

### 1.1 用户集合 (users)
**集合名**: `users`
**用途**: 存储用户基本信息和统计数据

```javascript
{
  _id: "用户唯一ID",
  _openid: "微信openid（自动生成）",
  nickname: "用户昵称",
  avatar: "头像URL",
  gender: 1, // 0-未知, 1-男, 2-女
  city: "城市",
  province: "省份", 
  country: "国家",
  phone: "手机号",
  stats: {
    posts: 0,        // 发布的帖子数量
    likes: 0,        // 获得的点赞数量
    follows: 0,      // 关注数量
    collections: 0,  // 收藏数量
    comments: 0,     // 评论数量
    analysis: 0      // 分析次数
  },
  createTime: "2024-01-01T00:00:00.000Z",
  updateTime: "2024-01-01T00:00:00.000Z"
}
```

### 1.2 短信验证码集合 (sms_codes)
**集合名**: `sms_codes`
**用途**: 存储短信验证码（临时数据，5分钟过期）

```javascript
{
  _id: "验证码ID",
  phone: "13800138000",
  code: "123456",
  createTime: "2024-01-01T00:00:00.000Z",
  expireTime: "2024-01-01T00:05:00.000Z"
}
```

### 1.3 户型分析集合 (house_analysis)
**集合名**: `house_analysis`
**用途**: 存储用户的户型分析记录

```javascript
{
  _id: "分析记录ID",
  _openid: "用户openid",
  userId: "用户ID",
  images: [
    "cloud://xxx/house-images/xxx.jpg",
    "cloud://xxx/house-images/xxx.jpg"
  ],
  formData: {
    birthInfo: "1990-01-01 08:30 男",
    orientation: "南北通透",
    area: "98"
  },
  focusAspects: ["财位", "厨房"], // 关注方面
  analysisResult: [
    {
      type: "财位",
      title: "财位分析",
      content: "财位位置良好...",
      score: 85,
      color: "#00a870",
      bgColor: "#f0f9f5",
      titleColor: "#00a870",
      contentColor: "#666666"
    }
  ],
  status: "completed", // pending, analyzing, completed, failed
  isPublished: false,  // 是否发布到社区
  createTime: "2024-01-01T00:00:00.000Z",
  updateTime: "2024-01-01T00:00:00.000Z"
}
```

### 1.4 社区帖子集合 (posts)
**集合名**: `posts`
**用途**: 存储用户发布的帖子（大家帮我看）

```javascript
{
  _id: "帖子ID",
  _openid: "发布者openid",
  userId: "发布者ID",
  userInfo: {
    nickname: "用户昵称",
    avatar: "头像URL"
  },
  title: "帖子标题",
  content: "帖子内容",
  images: [
    "cloud://xxx/post-images/xxx.jpg"
  ],
  houseInfo: {
    orientation: "南北通透",
    area: "98",
    location: "北京市朝阳区"
  },
  tags: ["求助", "户型分析"], // 标签
  stats: {
    views: 0,     // 浏览量
    likes: 0,     // 点赞数
    comments: 0,  // 评论数
    collections: 0 // 收藏数
  },
  status: "published", // draft, published, hidden
  createTime: "2024-01-01T00:00:00.000Z",
  updateTime: "2024-01-01T00:00:00.000Z"
}
```

### 1.5 评论集合 (comments)
**集合名**: `comments`
**用途**: 存储帖子评论

```javascript
{
  _id: "评论ID",
  _openid: "评论者openid",
  userId: "评论者ID",
  userInfo: {
    nickname: "用户昵称",
    avatar: "头像URL"
  },
  postId: "帖子ID",
  parentId: "父评论ID（回复时使用）",
  content: "评论内容",
  images: ["图片URL"], // 可选
  stats: {
    likes: 0 // 点赞数
  },
  createTime: "2024-01-01T00:00:00.000Z"
}
```

### 1.6 收藏集合 (collections)
**集合名**: `collections`
**用途**: 存储用户收藏的帖子

```javascript
{
  _id: "收藏记录ID",
  _openid: "用户openid",
  userId: "用户ID",
  postId: "帖子ID",
  postInfo: {
    title: "帖子标题",
    images: ["帖子图片"]
  },
  createTime: "2024-01-01T00:00:00.000Z"
}
```

### 1.7 点赞集合 (likes)
**集合名**: `likes`
**用途**: 存储点赞记录

```javascript
{
  _id: "点赞记录ID",
  _openid: "用户openid",
  userId: "用户ID",
  targetType: "post", // post, comment
  targetId: "目标ID（帖子ID或评论ID）",
  createTime: "2024-01-01T00:00:00.000Z"
}
```

### 1.8 消息通知集合 (notifications)
**集合名**: `notifications`
**用途**: 存储系统通知和消息

```javascript
{
  _id: "通知ID",
  _openid: "接收者openid",
  userId: "接收者ID",
  type: "system", // system, comment, like, follow
  title: "通知标题",
  content: "通知内容",
  data: {
    postId: "相关帖子ID",
    commentId: "相关评论ID"
  },
  isRead: false,
  createTime: "2024-01-01T00:00:00.000Z"
}
```

## 2. 云存储文件夹结构

### 2.1 用户头像
**路径**: `avatars/`
**命名规则**: `{timestamp}-{random}.jpg`
**示例**: `avatars/1704067200000-abc123.jpg`

### 2.2 户型图片
**路径**: `house-images/`
**命名规则**: `{userId}/{timestamp}-{index}.jpg`
**示例**: `house-images/user123/1704067200000-1.jpg`

### 2.3 帖子图片
**路径**: `post-images/`
**命名规则**: `{userId}/{postId}/{timestamp}-{index}.jpg`
**示例**: `post-images/user123/post456/1704067200000-1.jpg`

### 2.4 评论图片
**路径**: `comment-images/`
**命名规则**: `{userId}/{commentId}/{timestamp}-{index}.jpg`
**示例**: `comment-images/user123/comment789/1704067200000-1.jpg`

## 3. 数据库索引建议

### 3.1 用户集合索引
- `_openid` (唯一索引)
- `phone` (唯一索引，稀疏)
- `createTime` (降序)

### 3.2 户型分析集合索引
- `_openid` + `createTime` (复合索引，降序)
- `status`
- `isPublished`

### 3.3 帖子集合索引
- `_openid` + `createTime` (复合索引，降序)
- `status` + `createTime` (复合索引，降序)
- `tags`

### 3.4 评论集合索引
- `postId` + `createTime` (复合索引，降序)
- `_openid` + `createTime` (复合索引，降序)
- `parentId`

### 3.5 收藏集合索引
- `_openid` + `createTime` (复合索引，降序)
- `postId`

### 3.6 点赞集合索引
- `_openid` + `targetType` + `targetId` (复合唯一索引)
- `targetType` + `targetId` + `createTime` (复合索引)

### 3.7 通知集合索引
- `_openid` + `isRead` + `createTime` (复合索引，降序)
- `type` + `createTime` (复合索引，降序)

## 4. 权限配置

### 4.1 数据库权限
```javascript
// 用户集合权限
{
  "read": "auth.openid == resource.openid",
  "write": "auth.openid == resource.openid"
}

// 帖子集合权限
{
  "read": true, // 所有人可读
  "write": "auth.openid == resource.openid" // 只能修改自己的帖子
}

// 评论集合权限
{
  "read": true, // 所有人可读
  "write": "auth.openid == resource.openid" // 只能修改自己的评论
}
```

### 4.2 云存储权限
```javascript
// 用户头像权限
{
  "read": true,
  "write": "auth.openid != null && resource.openid == auth.openid"
}

// 其他图片权限
{
  "read": true,
  "write": "auth.openid != null"
}
```

## 5. 创建步骤

### 5.1 在微信开发者工具中
1. 打开云开发控制台
2. 进入数据库管理
3. 创建以上所有集合
4. 配置相应的权限规则
5. 创建建议的索引

### 5.2 使用云函数创建
调用 `initDatabase` 云函数自动创建所有集合

### 5.3 云存储文件夹
云存储文件夹会在首次上传文件时自动创建，无需手动创建。
