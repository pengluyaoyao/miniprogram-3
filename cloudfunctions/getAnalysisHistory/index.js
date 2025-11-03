// 查询用户分析历史记录
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { userId } = event;

  try {
    console.log('查询用户分析记录，userId:', userId);

    if (!userId) {
      return {
        success: false,
        message: '缺少用户ID'
      };
    }

    // 查询该用户的所有分析记录，按创建时间倒序排列
    const result = await db.collection('house_analysis')
      .where({
        userId: userId
      })
      .orderBy('createTime', 'desc')
      .limit(100)  // 限制最多返回100条
      .get();

    console.log('查询到记录数:', result.data.length);

    // 格式化数据
    const records = result.data.map(record => {
      // 确保 imageUrl 字段存在（兼容旧数据使用 houseDescription 的情况）
      const imageUrl = record.imageUrl || record.houseDescription;
      
      return {
        _id: record._id,
        imageUrl: imageUrl,
        houseDescription: imageUrl,  // 保持兼容性
        houseInfo: record.houseInfo,
        analysisResult: record.analysisResult,
        status: record.status,
        createTime: record.createTime,
        updateTime: record.updateTime
      };
    });

    return {
      success: true,
      records: records,
      count: records.length
    };

  } catch (error) {
    console.error('查询分析记录失败:', error);
    return {
      success: false,
      message: '查询失败: ' + error.message
    };
  }
};

