// 分析户型页面逻辑
import type { HouseInfo, AnalysisResult } from '../../services/aiService';
import { aiService } from '../../services/aiService';

interface FormData {
  imageUrl: string;  // 改为存储图片URL
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
      imageUrl: '',  // 改为存储图片URL
      birthInfo: '',
      orientation: '',
      area: '',
      rooms: '',
      floor: '',
      totalFloors: ''
    } as FormData,
    focusOptions: [
      { value: 'wealth', label: '财运', selected: true },
      { value: 'career', label: '事业', selected: false },
      { value: 'love', label: '爱情', selected: true },
      { value: 'marriage', label: '婚姻', selected: false },
      { value: 'family', label: '家人', selected: false },
      { value: 'health', label: '健康', selected: false },
      { value: 'study', label: '学业', selected: false }
    ] as FocusOption[],
    analysisResult: null as AnalysisResult | null,
    isAnalyzing: false,
    canPublish: false,
    currentAnalysisId: '',
    overallScore: 0,
    gridConfig: {
      column: 3,
      width: 210,
      height: 210
    }
  },

  onLoad(options: any) {
    // 页面加载时的初始化
    wx.cloud.init();
    
    // 如果从订阅消息通知进入，带有taskId参数，加载对应的分析结果
    if (options && options.taskId) {
      console.log('从消息通知进入，taskId:', options.taskId);
      this.loadAnalysisResult(options.taskId);
    }
  },

  // 图片上传成功
  async onUploadSuccess(e: any) {
    const { files } = e.detail;
    const tempFile = files[0];
    
    wx.showLoading({
      title: '上传中...',
      mask: true
    });

    try {
      // 获取临时文件路径
      const tempFilePath = tempFile.url;
      
      // 生成云存储文件名
      const cloudPath = `house_images/${Date.now()}-${Math.random().toString(36).slice(2)}.${tempFile.type || 'jpg'}`;
      
      console.log('开始上传到云存储:', cloudPath);
      
      // 上传到云存储
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: tempFilePath
      });

      console.log('云存储上传成功:', uploadResult);

      // 获取文件的访问URL
      const fileID = uploadResult.fileID;
      const tempFileURLs = await wx.cloud.getTempFileURL({
        fileList: [fileID]
      });

      const imageUrl = tempFileURLs.fileList[0].tempFileURL;
      console.log('图片URL:', imageUrl);

      // 更新状态
      this.setData({
        'formData.imageUrl': imageUrl,
        uploadFiles: [{
          url: imageUrl,
          name: tempFile.name || 'house-image',
          status: 'done'
        }]
      });

      wx.hideLoading();
      wx.showToast({
        title: '上传成功',
        icon: 'success'
      });

      this.checkCanPublish();

    } catch (error) {
      console.error('上传失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '上传失败，请重试',
        icon: 'none'
      });
    }
  },

  // 图片上传失败
  onUploadFail(e: any) {
    console.error('上传失败:', e);
    wx.showToast({
      title: '上传失败，请重试',
      icon: 'none'
    });
  },

  // 移除图片
  onUploadRemove() {
    // 清空图片、分析结果和所有相关状态
    this.setData({
      'formData.imageUrl': '',
      uploadFiles: [],
      analysisResult: null,          // 清空分析结果
      isAnalyzing: false,            // 重置分析状态
      currentAnalysisId: '',         // 清空分析ID
      overallScore: 0                // 重置评分
    });
    
    this.checkCanPublish();
    
    wx.showToast({
      title: '已清空',
      icon: 'success',
      duration: 1500
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
    // 简化条件，只要有图片就可以开始分析
    const { formData } = this.data;
    const hasImage = formData.imageUrl && formData.imageUrl.trim().length > 0;
    
    this.setData({
      canPublish: !!hasImage
    });
  },

  // 开始分析
  async startAnalysis() {
    if (!this.data.canPublish) {
      wx.showToast({
        title: '请先上传户型图',
        icon: 'none'
      });
      return;
    }

    // 请求订阅消息授权（用户离开后完成时通知）
    try {
      await wx.requestSubscribeMessage({
        tmplIds: ['0hz_amBSAdeRaNhLI0u832OhnPR0Qcl9vF03Ec5jIRE'],
        success: (res: any) => {
          console.log('订阅消息授权结果:', res);
        },
        fail: (err: any) => {
          console.log('用户未授权订阅消息:', err);
          // 即使用户拒绝订阅，也继续分析
        }
      });
    } catch (e) {
      console.log('订阅消息请求异常:', e);
      // 继续执行分析
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

      // 使用图片URL作为imageURL传递给后端
      const imageUrl = formData.imageUrl;

      console.log('【异步模式】准备调用AI分析，参数:', { imageUrl, houseInfo });

      // 更新加载提示
      wx.showLoading({
        title: '分析中，您可以离开小程序，完成后会通知您...',
        mask: true
      });

      // 调用AI分析（异步模式，会自动轮询）
      const result = await aiService.createAnalysis(imageUrl, houseInfo);

      console.log('AI分析结果:', result);
      console.log('result.success:', result.success);
      console.log('result.result:', JSON.stringify(result.result, null, 2));

      if (result.success && result.result) {
        console.log('准备显示结果...');
        console.log('analysisResult:', result.result);
        console.log('summary:', result.result.summary);
        console.log('aspects:', result.result.aspects);
        
        this.setData({
          analysisResult: result.result,
          currentAnalysisId: result.analysisId || '',
          overallScore: result.result.overallScore || 0,
          isAnalyzing: false
        });
        
        console.log('setData完成，当前analysisResult:', this.data.analysisResult);

        // 隐藏加载提示
        wx.hideLoading();
        
        wx.showToast({
          title: '分析完成',
          icon: 'success',
          duration: 2000
        });
        
        // 提示用户：您也可以离开小程序，完成后会收到消息通知
        // setTimeout(() => {
        //   wx.showToast({
        //     title: '您可以离开小程序，完成后会通知您',
        //     icon: 'none',
        //     duration: 3000
        //   });
        // }, 2500);
      } else {
        console.error('分析失败 - success:', result.success, ', result:', result.result);
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

  // 加载历史分析结果（从消息通知进入时调用）
  async loadAnalysisResult(taskId: string) {
    wx.showLoading({
      title: '加载分析结果...',
      mask: true
    });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'aiAnalysis',
        data: {
          name: 'getAnalysisResult',
          taskId: taskId
        }
      }) as any;
      
      console.log('加载分析结果:', result);
      
      if (result.result.success && result.result.result) {
        this.setData({
          analysisResult: result.result.result,
          currentAnalysisId: taskId,
          overallScore: result.result.result.overallScore || 0,
          isAnalyzing: false
        });
        
        wx.hideLoading();
        wx.showToast({
          title: '加载成功',
          icon: 'success',
          duration: 2000
        });
      } else {
        throw new Error(result.result.message || '加载失败');
      }
      
    } catch (error) {
      console.error('加载分析结果失败:', error);
      wx.hideLoading();
      wx.showModal({
        title: '加载失败',
        content: '无法加载该分析结果，请重新分析',
        showCancel: false
      });
    }
  }

});
