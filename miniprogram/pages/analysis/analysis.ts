// 分析户型页面逻辑
import type { HouseInfo, AnalysisResult } from '../../services/aiService';
import { aiService } from '../../services/aiService';

interface FormData {
  houseDescription: string;
  birthInfo: string;
  orientation: string;
  area: string;
  rooms: string;
  floor: string;
  totalFloors: string;
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


Page({
  data: {
    uploadFiles: [] as UploadFile[],
    formData: {
      houseDescription: '',
      birthInfo: '',
      orientation: '',
      area: '',
      rooms: '',
      floor: '',
      totalFloors: ''
    } as FormData,
    focusOptions: [
      { value: 'wealth', label: '财位', selected: true },
      { value: 'bedroom', label: '主卧', selected: false },
      { value: 'kitchen', label: '厨房', selected: true },
      { value: 'living', label: '客厅', selected: false },
      { value: 'bathroom', label: '卫生间', selected: false },
      { value: 'balcony', label: '阳台', selected: false },
      { value: 'entrance', label: '玄关', selected: false }
    ] as FocusOption[],
    analysisResult: null as AnalysisResult | null,
    isAnalyzing: false,
    canPublish: false,
    currentAnalysisId: '',
    overallScore: 0
  },

  onLoad() {
    // 页面加载时的初始化
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

  // 检查是否可以开始分析
  checkCanPublish() {
    // 简化条件，只要有户型描述就可以开始分析
    const { formData } = this.data;
    const hasDescription = formData.houseDescription && formData.houseDescription.trim().length > 0;
    
    this.setData({
      canPublish: !!hasDescription
    });
  },

  // 开始分析
  async startAnalysis() {
    if (!this.data.canPublish) {
      wx.showToast({
        title: '请先输入户型描述',
        icon: 'none'
      });
      return;
    }

    this.setData({ isAnalyzing: true });

    // 显示加载提示（异步模式）
    wx.showLoading({
      title: '提交分析任务...',
      mask: true
    });

    try {
      // 构建户型信息
      const { formData, focusOptions } = this.data;
      const selectedFocus = focusOptions
        .filter(option => option.selected)
        .map(option => option.label);

      const houseInfo: HouseInfo = {
        area: formData.area || '未填写',
        rooms: formData.rooms || '未填写',
        orientation: formData.orientation || '未填写',
        floor: formData.floor || '未填写',
        totalFloors: formData.totalFloors || '未填写',
        birthday: formData.birthInfo || '未填写',
        focusAspects: selectedFocus.length > 0 ? selectedFocus : ['综合分析']
      };

      // 使用户型描述作为"图片URL"传递给后端
      const houseDescription = formData.houseDescription;

      console.log('【异步模式】准备调用AI分析，参数:', { houseDescription, houseInfo });

      // 更新加载提示
      wx.showLoading({
        title: 'AI分析中，请稍候...',
        mask: true
      });

      // 调用AI分析（异步模式，会自动轮询）
      const result = await aiService.createAnalysis(houseDescription, houseInfo);

      console.log('AI分析结果:', result);

      if (result.success && result.result) {
        this.setData({
          analysisResult: result.result,
          currentAnalysisId: result.analysisId || '',
          overallScore: result.result.overallScore || 0,
          isAnalyzing: false
        });

        // 隐藏加载提示
        wx.hideLoading();
        
        wx.showToast({
          title: '分析完成',
          icon: 'success',
          duration: 2000
        });
      } else {
        throw new Error(result.message || '分析失败');
      }

    } catch (error) {
      console.error('分析失败:', error);
      console.error('错误详情:', JSON.stringify(error, null, 2));
      this.setData({ isAnalyzing: false });
      
      // 隐藏加载提示
      wx.hideLoading();
      
      // 显示错误信息
      const errorMsg = (error as Error).message || '分析失败，请重试';
      wx.showModal({
        title: '分析失败',
        content: errorMsg,
        showCancel: false,
        confirmText: '我知道了'
      });
    }
  },

});
