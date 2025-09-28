// 更新用户统计信息云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { userId, stats } = event;
  const wxContext = cloud.getWXContext();

  try {
    // 验证用户权限
    const userResult = await db.collection('users').doc(userId).get();
    if (!userResult.data || userResult.data.openid !== wxContext.OPENID) {
      return {
        success: false,
        message: '无权限修改'
      };
    }

    // 更新用户统计信息
    const currentStats = userResult.data.stats || {};
    const newStats = { ...currentStats, ...stats };

    await db.collection('users').doc(userId).update({
      data: {
        stats: newStats,
        updateTime: new Date()
      }
    });

    return {
      success: true,
      stats: newStats
    };

  } catch (error) {
    console.error('更新用户统计信息失败:', error);
    return {
      success: false,
      message: '更新失败'
    };
  }
};
