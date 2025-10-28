const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  console.log('云函数调用开始，参数:', JSON.stringify(event, null, 2));
  
  const { name, ...params } = event;
  
  try {
    console.log('操作类型:', name);
    
    switch (name) {
      case 'createAnalysis':
        return await createAnalysisAsync(params);
      case 'processTask':
        return await processTaskDirectly(params);
      case 'getAnalysisResult':
        return await getAnalysisResult(params);
      default:
        console.error('未知的操作类型:', name);
        return {
          success: false,
          message: '未知的操作类型: ' + name
        };
    }
  } catch (error) {
    console.error('AI分析云函数错误:', error);
    console.error('错误堆栈:', error.stack);
    return {
      success: false,
      message: error.message || '服务器内部错误',
      error: error.toString()
    };
  }
};

// 直接处理任务（同步模式）
async function processTaskDirectly(params) {
  console.log('processTaskDirectly 开始执行');
  console.log('接收的参数:', JSON.stringify(params, null, 2));
  
  const { taskId, ...analysisParams } = params;
  
  if (!taskId) {
    throw new Error('缺少 taskId 参数');
  }
  
  try {
    await processAnalysisInBackground(taskId, analysisParams);
    
    return {
      success: true,
      message: '任务处理完成'
    };
  } catch (error) {
    console.error('processTaskDirectly 出错:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 异步创建分析任务（立即返回，后台处理）
async function createAnalysisAsync(params) {
  console.log('【异步模式】创建分析任务，参数:', JSON.stringify(params, null, 2));
  
  const { imageUrl: houseDescription, houseInfo, userId } = params;
  
  try {
    // 参数验证
    if (!houseDescription) {
      throw new Error('缺少户型描述参数');
    }
    if (!houseInfo) {
      throw new Error('缺少户型信息参数');
    }
    if (!userId) {
      throw new Error('缺少用户ID参数');
    }
    
    // 立即创建任务记录（状态为 pending）
    const taskRecord = {
      userId: userId,
      houseDescription: houseDescription,
      houseInfo: houseInfo,
      status: 'pending',
      createTime: new Date(),
      updateTime: new Date()
    };
    
    const result = await db.collection('house_analysis').add({
      data: taskRecord
    });
    
    const taskId = result._id;
    console.log('任务已创建，ID:', taskId);
    
    // 立即返回任务ID
    return {
      success: true,
      taskId: taskId,
      status: 'pending',
      message: '分析任务已创建，请稍后查询结果'
    };
    
  } catch (error) {
    console.error('创建异步任务失败:', error);
    throw error;
  }
}

// 后台处理分析任务（调用百炼API并处理结果）
async function processAnalysisInBackground(taskId, params) {
  console.log('后台处理任务:', taskId);
  console.log('传入的 params:', JSON.stringify(params, null, 2));
  
  try {
    // 更新状态为处理中
    await db.collection('house_analysis').doc(taskId).update({
      data: {
        status: 'processing',
        message: '正在分析中...',
        updateTime: new Date()
      }
    });
    
    // 调用百炼API
    const result = await callBailianAPI(params);
    
    if (result && result.type === 'sync' && result.data) {
      // 处理同步返回的结果
      const apiResponse = result.data;
      
      // 提取分析结果
      let analysisResult = null;
      
      if (apiResponse.output && apiResponse.output.text) {
        analysisResult = apiResponse.output.text;
      } else if (apiResponse.output) {
        analysisResult = apiResponse.output;
      } else {
        throw new Error('百炼API返回格式错误');
      }
      
      console.log('分析结果（前200字）:', String(analysisResult).substring(0, 200));
      console.log('分析结果类型:', typeof analysisResult);
      
      // 解析结果
      const parsedResult = parseAnalysisResult(analysisResult);
      console.log('解析后的结果:', JSON.stringify(parsedResult, null, 2));
      
      // 更新为完成状态
      await db.collection('house_analysis').doc(taskId).update({
        data: {
          status: 'completed',
          message: '✅ 分析完成',
          analysisResult: parsedResult,
          rawResult: analysisResult,
          updateTime: new Date()
        }
      });
      
      console.log('已保存到数据库，taskId:', taskId);
      
      console.log('✅ 分析完成:', taskId);
    } else {
      throw new Error('百炼API返回数据格式错误');
    }
    
  } catch (error) {
    console.error('后台处理出错:', error);
    console.error('错误详情:', error.response?.data || error.message);
    
    // 更新为失败状态
    await db.collection('house_analysis').doc(taskId).update({
      data: {
        status: 'failed',
        error: error.message || '分析失败',
        updateTime: new Date()
      }
    }).catch(err => console.error('更新失败状态出错:', err));
  }
}

// 调用百炼API进行风水分析
async function callBailianAPI(params) {
  try {
    const { imageUrl, houseInfo } = params;
    const apiKey = process.env.DASHSCOPE_API_KEY;
    const appId = '443f631a301f4fe69186a7a95beaf0b7';
    
    const url = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`;
    
    console.log('调用百炼API...');
    console.log('图片URL:', imageUrl);
    
    // 构建请求数据
    const data = {
      input: {
        prompt: imageUrl,  // 图片URL作为prompt
        biz_params: {
          imageURL: imageUrl,
          area: houseInfo.area || '未填写',
          rooms: houseInfo.rooms || '未填写',
          directions: houseInfo.orientation || '未填写',
          floor: houseInfo.floor || '未填写',
          birth: houseInfo.birthday || '未填写',
          focus: Array.isArray(houseInfo.focusAspects) ? houseInfo.focusAspects.join('、') : '综合分析'
        }
      },
      parameters: {
        incremental_output: false
      }
    };
    
    console.log('百炼API请求参数:', JSON.stringify(data, null, 2));
    
    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 300000
    });
    
    console.log('百炼API调用成功');
    console.log('响应状态:', response.status);
    console.log('完整响应数据:', JSON.stringify(response.data, null, 2));
    
    return {
      type: 'sync',
      data: response.data
    };
    
  } catch (error) {
    console.error('调用百炼API失败:', error);
    console.error('错误详情:', error.response?.data || error.message);
    throw error;
  }
}

// 查询分析结果
async function getAnalysisResult(params) {
  const { taskId } = params;
  
  if (!taskId) {
    return {
      success: false,
      message: '缺少任务ID参数'
    };
  }
  
  try {
    const result = await db.collection('house_analysis').doc(taskId).get();
    
    if (!result.data) {
      return {
        success: false,
        message: '未找到该任务'
      };
    }
    
    const analysis = result.data;
    
    if (analysis.status === 'completed') {
      return {
        success: true,
        status: 'completed',
        result: analysis.analysisResult,
        message: analysis.message || '分析完成'
      };
    } else if (analysis.status === 'failed') {
      return {
        success: false,
        status: 'failed',
        message: analysis.error || '分析失败',
        error: analysis.error
      };
    } else {
      return {
        success: true,
        status: 'processing',
        message: analysis.message || 'AI正在分析中，请稍候...'
      };
    }
  } catch (error) {
    console.error('查询分析结果失败:', error);
    return {
      success: false,
      message: '查询失败: ' + error.message
    };
  }
}

// 解析分析结果
function parseAnalysisResult(resultText) {
  try {
    console.log('parseAnalysisResult 输入类型:', typeof resultText);
    console.log('parseAnalysisResult 输入内容（前100字）:', JSON.stringify(resultText).substring(0, 100));
    
    // 如果是对象且有 output 字段（百炼API返回格式）
    if (typeof resultText === 'object' && resultText.output) {
      console.log('检测到百炼API返回格式，提取 output 字段');
      return {
        summary: resultText.output,
        overallScore: 85,  // 默认分数
        aspects: []
      };
    }
    
    // 如果是字符串
    if (typeof resultText === 'string') {
      try {
        // 尝试解析JSON
        const parsed = JSON.parse(resultText);
        if (parsed.output) {
          // 如果解析后有 output 字段
          return {
            summary: parsed.output,
            overallScore: 85,
            aspects: []
          };
        }
        return parsed;
      } catch (e) {
        // 不是JSON，直接作为summary返回
        return {
          summary: resultText,
          overallScore: 85,
          aspects: []
        };
      }
    }
    
    // 如果已经是正确格式的对象
    if (typeof resultText === 'object' && resultText.summary) {
      return resultText;
    }
    
    // 其他情况，转为字符串
    return {
      summary: String(resultText),
      overallScore: 85,
      aspects: []
    };
    
  } catch (error) {
    console.error('解析结果失败:', error);
    return {
      summary: String(resultText),
      overallScore: 85,
      aspects: []
    };
  }
}
