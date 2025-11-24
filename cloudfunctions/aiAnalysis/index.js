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
    // 🔧 关键修改：不使用await，让处理在后台异步执行
    // 这样云函数可以立即返回，不会超时
    processAnalysisInBackground(taskId, analysisParams)
      .then(() => {
        console.log('✅ 后台处理完成:', taskId);
      })
      .catch(error => {
        console.error('❌ 后台处理失败:', taskId, error);
      });
    
    // 立即返回，不等待处理完成
    console.log('processTask 已触发，立即返回');
    return {
      success: true,
      message: '任务已开始处理'
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
    
    // 获取用户的openid（用于发送订阅消息）
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    console.log('用户openid:', openid);
    
    // 立即创建任务记录（状态为 pending）
    const taskRecord = {
      userId: userId,
      openid: openid,  // 保存openid，用于后续发送订阅消息
      imageUrl: houseDescription,  // 户型图URL
      houseDescription: houseDescription,  // 保持兼容性
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
  
  let taskOpenid = null;
  
  try {
    // 获取任务信息（包括openid）
    const taskInfo = await db.collection('house_analysis').doc(taskId).get();
    if (taskInfo.data && taskInfo.data.openid) {
      taskOpenid = taskInfo.data.openid;
      console.log('获取到任务的openid:', taskOpenid);
    }
    
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
      
      // 🆕 发送订阅消息通知用户
      console.log('检查是否需要发送订阅消息，taskOpenid:', taskOpenid);
      if (taskOpenid) {
        try {
          console.log('开始发送订阅消息...');
          await sendSubscribeMessage({
            openid: taskOpenid,
            taskId: taskId
          });
          console.log('✅ 订阅消息发送成功！');
        } catch (msgError) {
          console.error('❌ 发送订阅消息失败:', msgError);
          console.error('错误详情:', msgError.message || msgError);
          // 不影响主流程，继续执行
        }
      } else {
        console.log('⚠️ 未找到openid，跳过发送订阅消息');
      }
      
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
    // 百炼应用API格式：直接传递prompt（图片URL）和业务参数
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

// 发送订阅消息
async function sendSubscribeMessage({ openid, taskId }) {
  try {
    console.log('🔔 准备发送订阅消息:', { openid, taskId });
    
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // 请到微信公众平台查看您的模板实际字段名
    // 模板ID: 0hz_amBSAdeRaNhLI0u832OhnPR0Qcl9vF03Ec5jIRE
    // 字段：方案名称、完成时间、温馨提醒
    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
      page: `pages/analysis/analysis?taskId=${taskId}`,  // 带上任务ID，点击消息后跳转
      data: {
        thing1: {
          value: '户型优化分析'  // 方案名称（最多20个字符）
        },
        time2: {
          value: timeStr  // 完成时间
        },
        thing3: {
          value: '分析已完成，点击查看详情'  // 温馨提醒（最多20个字符）
        }
      },
      templateId: '0hz_amBSAdeRaNhLI0u832OhnPR0Qcl9vF03Ec5jIRE',
      miniprogramState: 'formal'  // 开发版，正式发布时改为 'formal'
    });
    
    console.log('🎉 订阅消息发送成功！结果:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ 发送订阅消息失败:', error);
    console.error('错误代码:', error.errCode);
    console.error('错误信息:', error.errMsg);
    console.error('完整错误:', JSON.stringify(error, null, 2));
    throw error;
  }
}

// 智能评分：根据文本内容分析打分（40-90分）
function calculateScoreFromText(text) {
  // 基准分数
  let score = 65;
  
  // 正面关键词（每个+2分，最多+25分）
  const positiveKeywords = [
    '吉利', '吉祥', '旺', '兴旺', '好', '佳', '优', '利', '顺', '和',
    '财运亨通', '事业有成', '家和万事兴', '平安', '健康', '如意',
    '聚财', '纳福', '招财', '进宝', '福气', '贵气', '生气', '旺气',
    '朝气蓬勃', '光明', '开阔', '通透', '宜居', '舒适', '和谐',
    '稳定', '安定', '繁荣', '昌盛', '兴旺发达', '蒸蒸日上',
    '有利于', '适合', '符合', '合理', '理想'
  ];
  
  // 负面关键词（每个-2分，最多-25分）
  const negativeKeywords = [
    '煞', '冲', '克', '忌', '凶', '差', '不利', '不好', '不佳', '欠佳',
    '破财', '漏财', '散财', '损财', '耗财', '败运', '衰', '煞气',
    '阴暗', '潮湿', '压抑', '拥挤', '狭窄', '混乱', '杂乱',
    '不宜', '应避免', '需注意', '有隐患', '问题', '缺陷',
    '阻碍', '妨碍', '影响', '干扰', '冲突', '矛盾'
  ];
  
  // 中等关键词（不影响评分，但计数）
  const neutralKeywords = [
    '一般', '尚可', '可以', '普通', '中等', '平平', '不错'
  ];
  
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
  
  // 统计正面词汇
  positiveKeywords.forEach(keyword => {
    const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
    positiveCount += matches;
  });
  
  // 统计负面词汇
  negativeKeywords.forEach(keyword => {
    const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
    negativeCount += matches;
  });
  
  // 统计中性词汇
  neutralKeywords.forEach(keyword => {
    const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
    neutralCount += matches;
  });
  
  console.log('评分统计 - 正面词:', positiveCount, '负面词:', negativeCount, '中性词:', neutralCount);
  
  // 计算分数调整
  const positiveBonus = Math.min(positiveCount * 2, 25);  // 最多+25分
  const negativePenalty = Math.min(negativeCount * 2, 25); // 最多-25分
  
  // 最终分数 = 基准分 + 正面加分 - 负面扣分
  score = score + positiveBonus - negativePenalty;
  
  // 确保分数在40-90之间
  score = Math.max(40, Math.min(90, score));
  
  console.log('智能评分结果:', score, '分 (基准65 + 正面', positiveBonus, '- 负面', negativePenalty, ')');
  
  return Math.round(score);
}

// 解析分析结果
function parseAnalysisResult(resultText) {
  try {
    console.log('parseAnalysisResult 输入类型:', typeof resultText);
    console.log('parseAnalysisResult 输入内容（前100字）:', JSON.stringify(resultText).substring(0, 100));
    
    let summaryText = '';
    
    // 提取文本内容
    if (typeof resultText === 'object' && resultText.output) {
      console.log('检测到百炼API返回格式，提取 output 字段');
      summaryText = resultText.output;
    } else if (typeof resultText === 'string') {
      try {
        // 尝试解析JSON
        const parsed = JSON.parse(resultText);
        if (parsed.output) {
          summaryText = parsed.output;
        } else if (parsed.summary) {
          return parsed; // 已经是正确格式
        } else {
          summaryText = resultText;
        }
      } catch (e) {
        // 不是JSON，直接作为summary返回
        summaryText = resultText;
      }
    } else if (typeof resultText === 'object' && resultText.summary) {
      return resultText; // 已经是正确格式
    } else {
      summaryText = String(resultText);
    }
    
    // 🔍 检测不合格图片的关键词
    const invalidKeywords = [
      '请上传合格',
      '不合格',
      '无法识别',
      '不符合要求',
      '非户型图',
      '请重新上传',
      '图片不清晰',
      '缺少方位标识'
    ];
    
    const isInvalidImage = invalidKeywords.some(keyword => 
      summaryText.includes(keyword)
    );
    
    console.log('是否为不合格图片:', isInvalidImage);
    
    // 根据是否合格返回不同的结果
    if (isInvalidImage) {
      // 不合格图片：设置为0分，标记为不合格
      return {
        summary: summaryText,
        overallScore: 0,  // 不合格评分为0
        aspects: [],
        isValid: false    // 标记为不合格
      };
    } else {
      // 合格图片：根据文本内容智能评分（40-90分）
      const calculatedScore = calculateScoreFromText(summaryText);
      
      return {
        summary: summaryText,
        overallScore: calculatedScore,  // 智能评分
        aspects: [],
        isValid: true      // 标记为合格
      };
    }
    
  } catch (error) {
    console.error('解析结果失败:', error);
    return {
      summary: String(resultText),
      overallScore: 0,
      aspects: [],
      isValid: false
    };
  }
}
