// 分析户型页面逻辑
interface FormData {
  birthInfo: string;
  orientation: string;
  houseType: string;
  area: string;
}

interface UploadFile {
  url: string;
  name: string;
  status: string;
}

interface FocusOption {
  value: string;
  label: string;
  selected: boolean;
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

Page({
  data: {
    uploadFiles: [] as UploadFile[],
    formData: {
      birthInfo: '',
      orientation: '',
      houseType: '',
      area: ''
    } as FormData,
    orientationOptions: ['正北', '东北', '正东', '东南', '正南', '西南', '正西', '西北'],
    orientationIndex: -1,
    houseTypeOptions: ['新房', '二手房', '租房'],
    houseTypeIndex: -1,
    focusOptions: [
      { value: 'wealth', label: '财位', selected: true },
      { value: 'bedroom', label: '主卧', selected: false },
      { value: 'kitchen', label: '厨房', selected: true },
      { value: 'living', label: '客厅', selected: false },
      { value: 'bathroom', label: '卫生间', selected: false },
      { value: 'balcony', label: '阳台', selected: false },
      { value: 'entrance', label: '玄关', selected: false }
    ] as FocusOption[],
    analysisResult: null as AnalysisResult[] | null,
    isAnalyzing: false,
    canPublish: false
  },

  onLoad() {
    // 页面加载时的初始化
  },

  // 上传文件变化
  onUploadChange(e: any) {
    console.log('上传文件变化:', e.detail);
    this.setData({
      uploadFiles: e.detail.files
    });
    this.checkCanPublish();
  },

  // 移除上传文件
  onUploadRemove(e: any) {
    console.log('移除文件:', e.detail);
    const files = this.data.uploadFiles.filter((_, index) => index !== e.detail.index);
    this.setData({
      uploadFiles: files
    });
    this.checkCanPublish();
  },

  // 上传成功
  onUploadSuccess(e: any) {
    console.log('上传成功:', e.detail);
    wx.showToast({
      title: '上传成功',
      icon: 'success'
    });
  },

  // 上传失败
  onUploadFail(e: any) {
    console.log('上传失败:', e.detail);
    wx.showToast({
      title: '上传失败',
      icon: 'none'
    });
  },

  // 表单数据变化
  onFormChange(e: any) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    
    this.setData({
      [`formData.${field}`]: value
    });
    this.checkCanPublish();
  },

  // 朝向选择变化
  onOrientationChange(e: any) {
    const index = e.detail.value;
    this.setData({
      orientationIndex: index,
      'formData.orientation': this.data.orientationOptions[index]
    });
    this.checkCanPublish();
  },

  // 房屋类型选择变化
  onHouseTypeChange(e: any) {
    const index = e.detail.value;
    this.setData({
      houseTypeIndex: index,
      'formData.houseType': this.data.houseTypeOptions[index]
    });
    this.checkCanPublish();
  },

  // 关注方面标签点击
  onFocusTagTap(e: any) {
    const index = e.currentTarget.dataset.index;
    const focusOptions = [...this.data.focusOptions];
    focusOptions[index].selected = !focusOptions[index].selected;
    
    this.setData({
      focusOptions
    });
    this.checkCanPublish();
  },

  // 检查是否可以发布
  checkCanPublish() {
    const { uploadFiles, formData } = this.data;
    const hasImage = uploadFiles.length > 0;
    const hasBasicInfo = formData.birthInfo && formData.orientation && formData.houseType && formData.area;
    
    this.setData({
      canPublish: hasImage && hasBasicInfo
    });
  },

  // 开始分析
  async startAnalysis() {
    this.setData({ isAnalyzing: true });

    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 模拟分析结果
      const mockResult: AnalysisResult[] = [
        {
          type: 'overall',
          title: '整体评价',
          content: '该户型整体布局合理，采光通风良好，符合现代居住需求。',
          color: '#00a870',
          bgColor: '#f3fff3',
          titleColor: '#00a870',
          contentColor: '#00a870'
        },
        {
          type: 'wealth',
          title: '财位建议',
          content: '客厅东南角为财位，建议放置绿色植物或招财摆件，避免放置杂物。',
          color: '#e37318',
          bgColor: '#fff7e6',
          titleColor: '#e37318',
          contentColor: '#e37318'
        },
        {
          type: 'kitchen',
          title: '厨房布局',
          content: '厨房位置合适，建议灶台避免正对水槽，保持水火平衡。',
          color: '#0052d9',
          bgColor: '#e6f3ff',
          titleColor: '#0052d9',
          contentColor: '#0052d9'
        },
        {
          type: 'warning',
          title: '注意事项',
          content: '主卧床头建议朝向东南，避免正对卫生间门。',
          color: '#d54941',
          bgColor: '#fff1f0',
          titleColor: '#d54941',
          contentColor: '#d54941'
        }
      ];

      this.setData({
        analysisResult: mockResult
      });

      wx.showToast({
        title: '分析完成',
        icon: 'success'
      });

    } catch (error) {
      console.error('分析失败:', error);
      wx.showToast({
        title: '分析失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isAnalyzing: false });
    }
  },

  // 发布按钮点击
  onPublishTap() {
    if (!this.data.canPublish) {
      wx.showToast({
        title: '请完善信息',
        icon: 'none'
      });
      return;
    }

    if (!this.data.analysisResult) {
      // 如果没有分析结果，先进行分析
      this.startAnalysis();
    } else {
      // 已有分析结果，直接发布
      this.publishAnalysis();
    }
  },

  // 发布分析结果
  async publishAnalysis() {
    try {
      // 模拟发布API调用
      await new Promise(resolve => setTimeout(resolve, 1000));

      wx.showToast({
        title: '发布成功',
        icon: 'success'
      });

      // 跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/home/home'
        });
      }, 1500);

    } catch (error) {
      console.error('发布失败:', error);
      wx.showToast({
        title: '发布失败',
        icon: 'none'
      });
    }
  },

  // 重新分析按钮点击
  onReAnalyzeTap() {
    this.setData({
      analysisResult: null
    });
    this.startAnalysis();
  }
});
