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
        return await createAnalysisAsync(params);  // 改为异步模式
      case 'getAnalysisResult':
        return await getAnalysisResult(params);
      case 'pollPendingTasks':
        return await pollPendingTasks(params);  // 轮询待处理任务
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
      status: 'pending',  // 待处理
      createTime: new Date(),
      updateTime: new Date()
    };
    
    const result = await db.collection('house_analysis').add({
      data: taskRecord
    });
    
    const taskId = result._id;
    console.log('任务已创建，ID:', taskId);
    
    // 异步调用实际的分析函数（不等待完成）
    processAnalysisInBackground(taskId, params).catch(error => {
      console.error('后台处理失败:', error);
      // 更新任务状态为失败
      db.collection('house_analysis').doc(taskId).update({
        data: {
          status: 'failed',
          error: error.message,
          updateTime: new Date()
        }
      }).catch(err => console.error('更新失败状态出错:', err));
    });
    
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
  
  try {
    // 更新状态为处理中
    await db.collection('house_analysis').doc(taskId).update({
      data: {
        status: 'processing',
        updateTime: new Date()
      }
    });
    
    // 调用百炼API（同步调用，在后台执行）
    const result = await submitBailianTask(params);
    
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
      
      // 解析结果
      const parsedResult = parseAnalysisResult(analysisResult);
      
      // 更新为完成状态
      await db.collection('house_analysis').doc(taskId).update({
        data: {
          status: 'completed',
          analysisResult: parsedResult,
          rawResult: analysisResult,
          updateTime: new Date()
        }
      });
      
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

// 调用百炼API进行分析（同步调用，但在后台异步执行）
async function submitBailianTask(params) {
  const { imageUrl: houseDescription, houseInfo } = params;
  
  try {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    const appId = 'c0cd2dd09f6f4dc7b40a12bf863a6614';
    
    const url = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`;
    
    // 构建请求数据（参考 scratch_4.py）
    const data = {
      input: {
        prompt: houseDescription,  // 图片URL作为prompt
        biz_params: {
          imageURL: houseDescription,  // 也作为biz_params传递
          area: houseInfo.area || '未填写',
          rooms: houseInfo.rooms || '未填写',
          directions: houseInfo.orientation || '未填写',
          floor: houseInfo.floor || '未填写',
          birth: houseInfo.birthday || '未填写',
          focus: Array.isArray(houseInfo.focusAspects) ? houseInfo.focusAspects.join('、') : '综合分析'
        }
      },
      parameters: {
        incremental_output: false  // 非流式输出
      }
    };
    
    console.log('调用百炼API，URL:', url);
    console.log('请求数据:', JSON.stringify(data, null, 2));
    
    const startTime = Date.now();
    
    // 同步调用百炼API（不使用异步头）
    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
        // 移除 X-DashScope-Async 头，使用同步模式
      },
      timeout: 300000  // 5分钟超时，给百炼足够的处理时间
    });
    
    const duration = (Date.now() - startTime) / 1000;
    console.log(`百炼API耗时: ${duration.toFixed(2)} 秒`);
    console.log('百炼API响应:', JSON.stringify(response.data, null, 2));
    
    // 返回特殊标记，表示同步完成
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

// 批量处理待处理的任务（供定时触发器调用，可选）
// 当前实现：同步模式不需要额外的轮询，后台处理函数已经自动完成
async function pollPendingTasks(params) {
  console.log('查询待处理任务状态');
  
  try {
    // 查询所有processing状态的记录
    const result = await db.collection('house_analysis')
      .where({
        status: 'processing'
      })
      .limit(20)
      .get();
    
    console.log('找到待处理任务数:', result.data.length);
    
    // 检查是否有超时的任务（超过10分钟仍在processing状态）
    const now = new Date();
    const tasks = result.data;
    let timeoutCount = 0;
    
    for (const task of tasks) {
      const updateTime = task.updateTime;
      if (updateTime) {
        const diffMs = now - updateTime;
        const diffMin = diffMs / 1000 / 60;
        
        // 如果超过10分钟，标记为超时失败
        if (diffMin > 10) {
          await db.collection('house_analysis').doc(task._id).update({
            data: {
              status: 'failed',
              error: '处理超时',
              updateTime: new Date()
            }
          });
          timeoutCount++;
          console.log('⏱️ 任务超时:', task._id);
        }
      }
    }
    
    return {
      success: true,
      message: `检查完成，超时任务: ${timeoutCount}`,
      processingCount: tasks.length,
      timeoutCount
    };
    
  } catch (error) {
    console.error('批量处理任务失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// 创建分析任务（同步版本，由后台调用）
async function createAnalysis(params) {
  console.log('执行分析任务，参数:', JSON.stringify(params, null, 2));
  
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
    
    console.log('户型描述:', houseDescription);
    console.log('户型信息:', JSON.stringify(houseInfo, null, 2));
    console.log('用户ID:', userId);
    
    // 获取环境变量
    const apiKey = process.env.DASHSCOPE_API_KEY;
    const appId = 'c0cd2dd09f6f4dc7b40a12bf863a6614';
    
    console.log('环境变量检查 - API Key存在:', !!apiKey);
    console.log('环境变量检查 - App ID存在:', !!appId);
    
    if (!apiKey || !appId) {
      throw new Error('缺少必要的环境变量配置 - API Key: ' + !!apiKey + ', App ID: ' + !!appId);
    }
    
    // 调用阿里云百炼API（工作流模式）
    const url = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`;
    
    // 构建楼层信息（合并 floor 和 totalFloors）
    let floorInfo = houseInfo.floor || '未填写';
    if (houseInfo.totalFloors && houseInfo.totalFloors !== '未填写') {
      floorInfo = `${houseInfo.floor}/${houseInfo.totalFloors}`;
    }
    
    // 将参数映射为阿里百炼工作流格式（参考 scratch_4.py）
    // prompt: 主要内容（户型描述）
    // biz_params: 业务参数（包括所有字段）
    const data = {
      input: {
        prompt: houseDescription,
        biz_params: {
          imageURL: houseDescription,  // imageURL 也包含在 biz_params 中
          area: houseInfo.area || '未填写',
          rooms: houseInfo.rooms || '未填写',
          directions: houseInfo.orientation || '未填写',
          floor: houseInfo.floor || '未填写',
          birth: houseInfo.birthday || '未填写',
          focus: Array.isArray(houseInfo.focusAspects) ? houseInfo.focusAspects.join('、') : '综合分析'
        }
      },
      parameters: {},
      debug: {}
    };
    
    console.log('调用百炼API:', url);
    console.log('请求数据:', JSON.stringify(data, null, 2));
    
    // 记录开始时间
    const apiStartTime = Date.now();
    
    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 900000 // 90秒超时（阿里云百炼 API 可能需要较长时间）
    });
    
    // 记录结束时间和耗时
    const apiEndTime = Date.now();
    const apiDuration = (apiEndTime - apiStartTime) / 1000;
    
    console.log('API响应状态:', response.status);
    console.log('API响应数据:', JSON.stringify(response.data, null, 2));
    console.log(`⏱️ 百炼API耗时: ${apiDuration.toFixed(2)} 秒`);
    
    // 如果耗时超过50秒，记录警告
    if (apiDuration > 50) {
      console.warn(`⚠️ API耗时过长 (${apiDuration.toFixed(2)}秒)，建议使用异步模式`);
    }
    
    if (response.status !== 200) {
      throw new Error(`API调用失败: ${response.status} - ${response.data?.message || '未知错误'}`);
    }
    
    // 提取分析结果（支持多种返回格式）
    let analysisResult = null;
    
    // 格式1: result.output (阿里云工作流)
    if (response.data && response.data.result && response.data.result.output) {
      analysisResult = response.data.result.output;
      console.log('✅ 使用 result.output 格式');
    }
    // 格式2: output.text (标准格式)
    else if (response.data && response.data.output && response.data.output.text) {
      analysisResult = response.data.output.text;
      console.log('✅ 使用 output.text 格式');
    }
    // 格式3: output (直接输出)
    else if (response.data && response.data.output) {
      analysisResult = response.data.output;
      console.log('✅ 使用 output 格式');
    }
    else {
      console.error('❌ API返回数据格式错误:', JSON.stringify(response.data));
      throw new Error('API返回数据格式错误: 未找到 result.output 或 output.text');
    }
    
    console.log('分析结果内容（前200字）:', analysisResult.substring(0, 200));
    
    // 解析分析结果
    const parsedResult = parseAnalysisResult(analysisResult);
    
    // 异步模式下不保存到数据库（由后台处理函数保存）
    // 直接返回结果
    return {
      success: true,
      result: parsedResult,
      rawResult: analysisResult,  // 返回原始结果，供后台保存
      message: '分析完成'
    };
    
  } catch (error) {
    console.error('创建分析任务失败:', error);
    // 异步模式下由后台处理函数处理失败情况
    return {
      success: false,
      message: error.message,
      error: error.toString()
    };
  }
}

// 获取分析结果（查询数据库状态）
async function getAnalysisResult(params) {
  const { analysisId, taskId, userId } = params;
  const queryId = taskId || analysisId;  // 支持两种ID格式
  
  console.log('查询分析结果，ID:', queryId, 'userId:', userId);
  
  try {
    const result = await db.collection('house_analysis')
      .where({
        _id: queryId,
        userId: userId
      })
      .get();
    
    if (result.data.length === 0) {
      return {
        success: false,
        status: 'not_found',
        message: '分析记录不存在'
      };
    }
    
    const analysis = result.data[0];
    const status = analysis.status;
    
    console.log('任务状态:', status);
    
    // 根据状态返回不同结果
    if (status === 'completed') {
      return {
        success: true,
        status: 'completed',
        result: analysis.analysisResult,
        analysis: analysis,
        message: '分析完成'
      };
    } else if (status === 'failed') {
      return {
        success: false,
        status: 'failed',
        message: analysis.error || '分析失败',
        error: analysis.error
      };
    } else if (status === 'processing') {
      return {
        success: false,
        status: 'processing',
        message: 'AI正在分析中，请稍候...'
      };
    } else {
      // pending 或其他状态
      return {
        success: false,
        status: 'pending',
        message: '分析任务排队中，请稍候...'
      };
    }
    
  } catch (error) {
    console.error('获取分析结果失败:', error);
    return {
      success: false,
      status: 'error',
      message: error.message
    };
  }
}

// 注意：参数直接映射到阿里百炼应用的变量，不再使用 prompt 构建函数

// 解析分析结果
function parseAnalysisResult(rawResult) {
  console.log('开始解析分析结果，类型:', typeof rawResult);
  console.log('结果内容（前500字）:', JSON.stringify(rawResult).substring(0, 500));
  
  try {
    // 如果已经是对象，直接返回
    if (typeof rawResult === 'object' && rawResult !== null) {
      console.log('✅ 结果已是对象，直接返回');
      // 检查是否符合预期格式
      if (rawResult.overallScore && rawResult.aspects) {
        return rawResult;
      }
      // 如果不符合格式，包装一下
      return {
        overallScore: rawResult.overallScore || 75,
        aspects: rawResult.aspects || [
          {
            type: "综合分析",
            title: "风水分析",
            content: JSON.stringify(rawResult, null, 2),
            score: 75,
            suggestions: ["请查看详细内容"],
            color: "#0052d9"
          }
        ],
        summary: rawResult.summary || "分析完成"
      };
    }
    
    // 如果是字符串，尝试解析JSON
    if (typeof rawResult === 'string') {
      console.log('结果是字符串，尝试解析JSON');
      
      // 尝试直接解析整个字符串
      try {
        const parsed = JSON.parse(rawResult);
        console.log('✅ 成功解析JSON');
        if (parsed.overallScore && parsed.aspects) {
          return parsed;
        }
        // 包装不符合格式的对象
        return {
          overallScore: parsed.overallScore || 75,
          aspects: parsed.aspects || [
            {
              type: "综合分析",
              title: "风水分析",
              content: JSON.stringify(parsed, null, 2),
              score: 75,
              suggestions: ["请查看详细内容"],
              color: "#0052d9"
            }
          ],
          summary: parsed.summary || "分析完成"
        };
      } catch (e) {
        console.log('直接解析失败，尝试提取JSON:', e.message);
      }
      
      // 尝试从字符串中提取JSON
      const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('✅ 从文本中提取JSON成功');
          if (parsed.overallScore && parsed.aspects) {
            return parsed;
          }
          return {
            overallScore: parsed.overallScore || 75,
            aspects: parsed.aspects || [
              {
                type: "综合分析",
                title: "风水分析",
                content: JSON.stringify(parsed, null, 2),
                score: 75,
                suggestions: ["请查看详细内容"],
                color: "#0052d9"
              }
            ],
            summary: parsed.summary || "分析完成"
          };
        } catch (e) {
          console.log('提取的JSON解析失败:', e.message);
        }
      }
      
      // 如果都失败了，将纯文本作为内容
      console.log('⚠️ 无法解析JSON，使用纯文本');
      return {
        overallScore: 75,
        aspects: [
          {
            type: "综合分析",
            title: "风水分析",
            content: rawResult,
            score: 75,
            suggestions: ["请咨询专业风水师获取更详细建议"],
            color: "#0052d9"
          }
        ],
        summary: "AI分析完成，建议结合实际情况参考"
      };
    }
    
    // 其他情况
    console.log('⚠️ 未知类型，使用默认结构');
    return {
      overallScore: 75,
      aspects: [
        {
          type: "综合分析",
          title: "风水分析",
          content: String(rawResult),
          score: 75,
          suggestions: ["请咨询专业风水师"],
          color: "#0052d9"
        }
      ],
      summary: "AI分析完成"
    };
    
  } catch (error) {
    console.error('❌ 解析分析结果失败:', error);
    console.error('错误详情:', error.stack);
    
    // 返回默认结构
    return {
      overallScore: 70,
      aspects: [
        {
          type: "分析结果",
          title: "风水分析",
          content: String(rawResult) || "分析完成，请查看详细内容",
          score: 70,
          suggestions: ["建议咨询专业人士"],
          color: "#666666"
        }
      ],
      summary: "分析已完成"
    };
  }
}
