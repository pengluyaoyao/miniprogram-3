// AI分析服务
export interface HouseInfo {
  area?: string;
  rooms?: string;
  orientation?: string;
  floor?: string;
  totalFloors?: string;
  birthday?: string;
  focusAspects?: string[];
}

export interface AnalysisAspect {
  type: string;
  title: string;
  content: string;
  score: number;
  suggestions?: string[];
  color?: string;
}

export interface AnalysisResult {
  overallScore: number;
  aspects: AnalysisAspect[];
  summary?: string;
}

interface CloudFunctionResult {
  success: boolean;
  result?: AnalysisResult;
  analysisId?: string;
  message?: string;
  error?: string;
  status?: string;
}

class AIService {
  /**
   * 创建AI分析（异步模式）
   * @param houseDescription 户型描述
   * @param houseInfo 户型信息
   * @returns 分析结果
   */
  async createAnalysis(
    houseDescription: string,
    houseInfo: HouseInfo
  ): Promise<CloudFunctionResult> {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo || !userInfo._id) {
        throw new Error('请先登录');
      }

      console.log('【异步模式】调用AI分析云函数: aiAnalysis');
      console.log('参数:', {
        name: 'createAnalysis',
        imageUrl: houseDescription,
        houseInfo,
        userId: userInfo._id
      });

      // 调用云函数创建任务（立即返回）
      const result = await wx.cloud.callFunction({
        name: 'aiAnalysis',
        data: {
          name: 'createAnalysis',
          imageUrl: houseDescription,
          houseInfo: houseInfo,
          userId: userInfo._id
        }
      });

      console.log('云函数返回:', result);

      const cloudResult = result.result as any;

      if (cloudResult && cloudResult.success) {
        const taskId = cloudResult.taskId;
        console.log('任务已创建，ID:', taskId);

        // 立即触发任务处理（不等待完成）
        console.log('→ 立即调用 processTask 开始处理...');
        wx.cloud.callFunction({
          name: 'aiAnalysis',
          data: {
            name: 'processTask',
            taskId: taskId,
            imageUrl: houseDescription,
            houseInfo: houseInfo,
            userId: userInfo._id
          }
        }).then(() => {
          console.log('processTask 调用成功');
        }).catch(err => {
          console.error('processTask 调用失败:', err);
        });

        // 开始轮询查询结果
        const finalResult = await this.pollAnalysisResult(taskId, userInfo._id);
        return finalResult;
      } else {
        throw new Error(cloudResult?.message || '创建任务失败');
      }
    } catch (error) {
      console.error('AI分析失败:', error);
      return {
        success: false,
        message: (error as Error).message || '分析失败，请重试',
        error: (error as Error).toString()
      };
    }
  }

  /**
   * 轮询查询分析结果
   * @param taskId 任务ID
   * @param userId 用户ID
   * @returns 分析结果
   */
  private async pollAnalysisResult(taskId: string, userId: string): Promise<CloudFunctionResult> {
    const maxAttempts = 60;  // 最多查询60次
    const interval = 5000;   // 每5秒查询一次（总共5分钟）

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`查询进度 ${attempt}/${maxAttempts}...`);

      try {
        const result = await wx.cloud.callFunction({
          name: 'aiAnalysis',
          data: {
            name: 'getAnalysisResult',
            taskId: taskId,
            userId: userId
          }
        });

        const cloudResult = result.result as any;

        if (cloudResult.status === 'completed') {
          console.log('分析完成！');
          return {
            success: true,
            result: cloudResult.result,
            analysisId: taskId,
            message: '分析完成'
          };
        } else if (cloudResult.status === 'failed') {
          console.error('分析失败:', cloudResult.message);
          return {
            success: false,
            message: cloudResult.message || '分析失败',
            error: cloudResult.error
          };
        } else {
          // pending 或 processing，继续等待
          console.log('状态:', cloudResult.status, cloudResult.message);

          // 等待一段时间后继续查询
          await this.sleep(interval);
        }
      } catch (error) {
        console.error('查询结果出错:', error);
        // 继续尝试
        await this.sleep(interval);
      }
    }

    // 超时
    return {
      success: false,
      message: '分析超时，请稍后在历史记录中查看'
    };
  }

  /**
   * 延时函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取分析结果（按ID查询）
   * @param analysisId 分析ID
   * @returns 分析结果
   */
  async getAnalysisResult(analysisId: string): Promise<CloudFunctionResult> {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo || !userInfo._id) {
        throw new Error('请先登录');
      }

      const result = await wx.cloud.callFunction({
        name: 'aiAnalysis',
        data: {
          name: 'getAnalysisResult',
          taskId: analysisId,
          userId: userInfo._id
        }
      });

      const cloudResult = result.result as any;

      if (cloudResult.status === 'completed') {
        return {
          success: true,
          result: cloudResult.result,
          analysisId: analysisId,
          message: '分析完成'
        };
      } else if (cloudResult.status === 'failed') {
        return {
          success: false,
          message: cloudResult.message || '分析失败',
          error: cloudResult.error
        };
      } else {
        return {
          success: false,
          status: cloudResult.status,
          message: cloudResult.message || '分析进行中'
        };
      }
    } catch (error) {
      console.error('获取分析结果失败:', error);
      return {
        success: false,
        message: (error as Error).message || '获取结果失败',
        error: (error as Error).toString()
      };
    }
  }
}

export const aiService = new AIService();
