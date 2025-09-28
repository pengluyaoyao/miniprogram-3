// 获取手机号云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const { code } = event;

  try {
    // 调用微信API获取手机号
    const result = await cloud.openapi.phonenumber.getPhoneNumber({
      code: code
    });

    if (result.errcode === 0) {
      return {
        success: true,
        phoneNumber: result.phone_info.phoneNumber
      };
    } else {
      return {
        success: false,
        message: '获取手机号失败'
      };
    }

  } catch (error) {
    console.error('获取手机号失败:', error);
    return {
      success: false,
      message: '获取手机号失败'
    };
  }
};
