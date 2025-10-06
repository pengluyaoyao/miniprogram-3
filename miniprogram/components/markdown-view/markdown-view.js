// components/markdown-view/markdown-view.js
Component({
  properties: {
    content: {
      type: String,
      value: '',
      observer: 'onContentChange'
    }
  },

  data: {
    htmlContent: ''
  },

  methods: {
    onContentChange(newVal) {
      if (newVal) {
        const html = this.markdownToHtml(newVal);
        this.setData({
          htmlContent: html
        });
      } else {
        this.setData({
          htmlContent: ''
        });
      }
    },

    markdownToHtml(markdown) {
      if (!markdown) return '';
      
      let html = String(markdown);

      // 转义特殊字符（但不转义已有的HTML标签）
      // html = html.replace(/&/g, '&amp;');
      
      // 标题 (h3, h2, h1)
      html = html.replace(/^### (.*$)/gim, '<div style="font-size:30rpx;font-weight:600;margin:16rpx 0 12rpx 0;">$1</div>');
      html = html.replace(/^## (.*$)/gim, '<div style="font-size:32rpx;font-weight:600;margin:20rpx 0 12rpx 0;">$1</div>');
      html = html.replace(/^# (.*$)/gim, '<div style="font-size:36rpx;font-weight:700;margin:24rpx 0 16rpx 0;">$1</div>');

      // 粗体 **text**
      html = html.replace(/\*\*(.*?)\*\*/g, '<span style="font-weight:600;color:#000000;">$1</span>');
      
      // 斜体 *text* (避免与粗体冲突)
      html = html.replace(/(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/g, '<span style="font-style:italic;color:#666666;">$1</span>');

      // 删除线 ~~text~~
      html = html.replace(/~~(.*?)~~/g, '<span style="text-decoration:line-through;color:#999999;">$1</span>');

      // 行内代码 `code`
      html = html.replace(/`([^`]+)`/g, '<span style="background-color:#f6f8fa;padding:2rpx 8rpx;border-radius:6rpx;color:#d73a49;font-size:26rpx;">$1</span>');

      // 无序列表 - item 或 * item
      html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<div style="margin:8rpx 0 8rpx 40rpx;">• $1</div>');

      // 有序列表 1. item  
      let listCounter = 0;
      html = html.replace(/^\s*(\d+)\.\s+(.*)$/gim, (match, num, content) => {
        return `<div style="margin:8rpx 0 8rpx 40rpx;">${num}. ${content}</div>`;
      });

      // 引用 > quote
      html = html.replace(/^>\s?(.*)$/gim, '<div style="border-left:8rpx solid #0052d9;padding:16rpx 24rpx;margin:16rpx 0;background-color:#f8f9fa;color:#666666;border-radius:8rpx;">$1</div>');

      // 分割线 --- 或 ***
      html = html.replace(/^(-{3,}|\*{3,})$/gim, '<div style="border-top:2rpx solid #e1e4e8;margin:24rpx 0;"></div>');

      // 换行处理
      html = html.replace(/\n\n/g, '</div><div style="margin:12rpx 0;">');
      html = html.replace(/\n/g, '<br/>');

      // 包装
      html = `<div style="font-size:28rpx;line-height:1.8;color:#333333;">${html}</div>`;

      return html;
    }
  }
});

