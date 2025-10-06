# TDesign字体加载问题修复

## 问题描述

编译小程序时遇到以下错误：
```
[Network layer in render layer error] Failed to load font https://tdesign.gtimg.com/icon/0.3.2/fonts/t.woff
net::ERR_CACHE_MISS
```

## 问题原因

TDesign组件库的图标组件尝试从CDN加载字体文件，但在微信小程序环境中无法访问外部网络资源。

## 解决方案

### 1. 直接修改TDesign源文件（彻底解决）

直接修改 `miniprogram/miniprogram_npm/tdesign-miniprogram/icon/icon.wxss` 文件：

- 将字体加载URL替换为 `src: none`
- 修改字体族为 `font-family: inherit`

### 2. 全局样式强制覆盖

在 `miniprogram/app.less` 中添加强制覆盖样式：

- 多重 `@font-face` 禁用：`src: none !important`
- 强制重置所有图标样式：`[class*="t-icon"]`
- 为常用图标提供emoji替代显示

### 3. 自定义图标组件（备用方案）

创建了 `miniprogram/components/custom-icon/` 组件：

- 使用emoji替代TDesign图标
- 完全避免字体加载问题
- 可以替换项目中的 `<t-icon>` 组件

### 4. 图标替代方案

为项目中使用的图标提供了emoji替代：

| TDesign图标 | Emoji替代 |
|------------|-----------|
| edit | ✏️ |
| home | 🏠 |
| user | 👤 |
| heart | ❤️ |
| thumb-up | 👍 |
| chat | 💬 |
| image | 🖼️ |
| mobile | 📱 |
| setting | ⚙️ |
| lock-on | 🔒 |
| help-circle | ❓ |
| notification | 🔔 |
| share | 📤 |
| time | ⏰ |
| bookmark | 🔖 |
| send | 📤 |
| check-circle-filled | ✅ |

## 使用方法

### 方法一：直接修复（推荐）
1. TDesign源文件已修改，字体加载已禁用
2. 全局样式已强制覆盖
3. 重新编译小程序即可

### 方法二：使用自定义图标组件
1. 在需要的页面json中引入：
```json
{
  "usingComponents": {
    "custom-icon": "/components/custom-icon/custom-icon"
  }
}
```

2. 替换原有的t-icon：
```xml
<!-- 原来 -->
<t-icon name="edit" size="24rpx" color="#ffffff" />

<!-- 替换为 -->
<custom-icon name="edit" size="24rpx" color="#ffffff" />
```

## 注意事项

- 这个修复方案使用emoji替代TDesign图标字体
- 如果希望使用原生图标，可以考虑：
  - 使用微信小程序内置图标
  - 使用其他图标库（如iconfont）
  - 使用图片图标

## 测试验证

修复后，编译小程序时应该不再出现字体加载错误，图标正常显示为emoji。
