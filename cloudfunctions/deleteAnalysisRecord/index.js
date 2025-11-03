// 删除分析记录
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { recordId } = event;
  const wxContext = cloud.getWXContext();

  try {
    console.log('删除分析记录，recordId:', recordId);

    if (!recordId) {
      return {
        success: false,
        message: '缺少记录ID'
      };
    }

    // 删除记录
    const result = await db.collection('house_analysis')
      .doc(recordId)
      .remove();

    console.log('删除结果:', result);

    if (result.stats.removed === 1) {
      return {
        success: true,
        message: '删除成功'
      };
    } else {
      return {
        success: false,
        message: '记录不存在或已被删除'
      };
    }

  } catch (error) {
    console.error('删除分析记录失败:', error);
    return {
      success: false,
      message: '删除失败: ' + error.message
    };
  }
};

