// 删除旧头像云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const { oldAvatarUrl } = event;

  try {
    if (!oldAvatarUrl) {
      return {
        success: true,
        message: '没有需要删除的头像'
      };
    }

    // 从云存储中删除旧头像
    const result = await cloud.deleteFile({
      fileList: [oldAvatarUrl]
    });

    console.log('删除旧头像结果:', result);

    return {
      success: true,
      message: '旧头像删除成功'
    };

  } catch (error) {
    console.error('删除旧头像失败:', error);
    return {
      success: false,
      message: '删除旧头像失败: ' + error.message
    };
  }
};
