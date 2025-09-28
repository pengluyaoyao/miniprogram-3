// 户型详情页面逻辑
interface HouseDetail {
  id: string;
  title: string;
  image: string;
  type: string;
  author: string;
  time: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  isCollected: boolean;
  analysisResult: AnalysisResult[];
}

interface AnalysisResult {
  type: string;
  title: string;
  content: string;
  color: string;
  bgColor: string;
  titleColor: string;
  contentColor: string;
}

interface Comment {
  id: string;
  author: string;
  avatar: string;
  content: string;
  time: string;
  likes: number;
}

Page({
  data: {
    houseDetail: {} as HouseDetail,
    comments: [] as Comment[],
    commentInput: '',
    userAvatar: 'https://via.placeholder.com/64x64/6b7280/ffffff?text=我'
  },

  onLoad(options: any) {
    const { id, title } = options;
    this.loadHouseDetail(id);
    this.loadComments();
  },

  // 加载户型详情
  async loadHouseDetail(id: string) {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockDetail: HouseDetail = {
        id: id || '1',
        title: decodeURIComponent(wx.getStorageSync('detailTitle') || '南北通透三居室，财位布局优化建议'),
        image: 'https://via.placeholder.com/400x300/4f46e5/ffffff?text=户型图大图',
        type: '三室两厅',
        author: '风水大师',
        time: '2小时前',
        likes: 128,
        comments: 23,
        isLiked: false,
        isCollected: false,
        analysisResult: [
          {
            type: 'overall',
            title: '整体评价',
            content: '该户型整体布局合理，采光通风良好，符合现代居住需求。南北通透的设计有利于空气流通，居住舒适度较高。',
            color: '#00a870',
            bgColor: '#f3fff3',
            titleColor: '#00a870',
            contentColor: '#00a870'
          },
          {
            type: 'wealth',
            title: '财位分析',
            content: '客厅东南角为财位，建议放置绿色植物如发财树、富贵竹等招财植物，避免放置杂物或垃圾桶。',
            color: '#e37318',
            bgColor: '#fff7e6',
            titleColor: '#e37318',
            contentColor: '#e37318'
          },
          {
            type: 'kitchen',
            title: '厨房布局',
            content: '厨房位置合适，但灶台与水槽距离较近，建议在中间放置绿色植物或使用木质隔断来平衡水火关系。',
            color: '#0052d9',
            bgColor: '#e6f3ff',
            titleColor: '#0052d9',
            contentColor: '#0052d9'
          },
          {
            type: 'warning',
            title: '注意事项',
            content: '主卧床头建议朝向东南方向，避免正对卫生间门。如无法调整，可在门后放置屏风或植物化解。',
            color: '#d54941',
            bgColor: '#fff1f0',
            titleColor: '#d54941',
            contentColor: '#d54941'
          },
          {
            type: 'luck',
            title: '开运建议',
            content: '在玄关处放置鱼缸或水景装饰，有助于提升财运。客厅可摆放圆形或椭圆形的家具，象征圆满和谐。',
            color: '#8b5cf6',
            bgColor: '#f3f0ff',
            titleColor: '#8b5cf6',
            contentColor: '#8b5cf6'
          }
        ]
      };

      this.setData({
        houseDetail: mockDetail
      });

    } catch (error) {
      console.error('加载户型详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 加载评论列表
  async loadComments() {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 300));

      const mockComments: Comment[] = [
        {
          id: '1',
          author: '风水爱好者',
          avatar: 'https://via.placeholder.com/80x80/6366f1/ffffff?text=A',
          content: '分析得很专业！我家也是类似的户型，准备按照建议调整一下布局。',
          time: '1小时前',
          likes: 12
        },
        {
          id: '2',
          author: '装修达人',
          avatar: 'https://via.placeholder.com/80x80/059669/ffffff?text=B',
          content: '请问客厅的财位具体在哪个位置？能标出来吗？',
          time: '2小时前',
          likes: 8
        },
        {
          id: '3',
          author: '新手小白',
          avatar: 'https://via.placeholder.com/80x80/dc2626/ffffff?text=C',
          content: '学到了很多！原来风水还有这么多讲究，谢谢分享～',
          time: '3小时前',
          likes: 5
        }
      ];

      this.setData({
        comments: mockComments
      });

    } catch (error) {
      console.error('加载评论失败:', error);
    }
  },

  // 图片点击
  onImageTap() {
    // 可以添加图片预览功能
    wx.previewImage({
      urls: [this.data.houseDetail.image],
      current: this.data.houseDetail.image
    });
  },

  // 点赞
  onLikeTap() {
    const { houseDetail } = this.data;
    const newLikes = houseDetail.isLiked ? houseDetail.likes - 1 : houseDetail.likes + 1;
    
    this.setData({
      'houseDetail.isLiked': !houseDetail.isLiked,
      'houseDetail.likes': newLikes
    });

    wx.showToast({
      title: houseDetail.isLiked ? '取消点赞' : '点赞成功',
      icon: 'none'
    });
  },

  // 收藏
  onCollectTap() {
    const { houseDetail } = this.data;
    
    this.setData({
      'houseDetail.isCollected': !houseDetail.isCollected
    });

    wx.showToast({
      title: houseDetail.isCollected ? '取消收藏' : '收藏成功',
      icon: 'none'
    });
  },

  // 分享
  onShareTap() {
    wx.showActionSheet({
      itemList: ['分享给朋友', '分享到朋友圈', '复制链接'],
      success: (res) => {
        console.log('分享选择:', res.tapIndex);
        wx.showToast({
          title: '分享成功',
          icon: 'success'
        });
      }
    });
  },

  // 评论点击
  onCommentTap() {
    // 滚动到评论区域
    wx.pageScrollTo({
      selector: '.comments-section',
      duration: 300
    });
  },

  // 评论点赞
  onCommentLike(e: any) {
    const commentId = e.currentTarget.dataset.id;
    const comments = this.data.comments.map(comment => {
      if (comment.id === commentId) {
        return { ...comment, likes: comment.likes + 1 };
      }
      return comment;
    });

    this.setData({ comments });

    wx.showToast({
      title: '点赞成功',
      icon: 'none'
    });
  },

  // 回复评论
  onReply(e: any) {
    const commentId = e.currentTarget.dataset.id;
    console.log('回复评论:', commentId);
    
    wx.showToast({
      title: '回复功能开发中',
      icon: 'none'
    });
  },

  // 查看全部评论
  onViewAllComments() {
    wx.showToast({
      title: '查看全部评论',
      icon: 'none'
    });
  },

  // 评论输入变化
  onCommentInputChange(e: any) {
    this.setData({
      commentInput: e.detail.value
    });
  },

  // 提交评论
  onCommentSubmit() {
    const { commentInput, comments } = this.data;
    
    if (!commentInput.trim()) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      });
      return;
    }

    const newComment: Comment = {
      id: Date.now().toString(),
      author: '我',
      avatar: this.data.userAvatar,
      content: commentInput,
      time: '刚刚',
      likes: 0
    };

    this.setData({
      comments: [newComment, ...comments],
      commentInput: '',
      'houseDetail.comments': this.data.houseDetail.comments + 1
    });

    wx.showToast({
      title: '评论成功',
      icon: 'success'
    });
  }
});
