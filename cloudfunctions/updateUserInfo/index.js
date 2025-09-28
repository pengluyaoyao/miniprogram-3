// 更新用户信息云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { userId, userInfo } = event;
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

    // 更新用户信息
    await db.collection('users').doc(userId).update({
      data: {
        ...userInfo,
        updateTime: new Date()
      }
    });

    // 返回更新后的用户信息
    const updatedResult = await db.collection('users').doc(userId).get();

    return {
      success: true,
      userInfo: updatedResult.data
    };

  } catch (error) {
    console.error('更新用户信息失败:', error);
    return {
      success: false,
      message: '更新失败'
    };
  }
};
