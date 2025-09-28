// 发送短信验证码云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const { phone } = event;

  try {
    // 生成6位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 这里应该调用短信服务商API发送短信
    // 为了简化，我们模拟发送成功
    console.log(`发送验证码到 ${phone}: ${code}`);
    
    // 将验证码存储到云数据库中，设置过期时间
    const db = cloud.database();
    await db.collection('sms_codes').add({
      data: {
        phone: phone,
        code: code,
        createTime: new Date(),
        expireTime: new Date(Date.now() + 5 * 60 * 1000) // 5分钟后过期
      }
    });

    return {
      success: true,
      message: '验证码已发送'
    };

  } catch (error) {
    console.error('发送短信验证码失败:', error);
    return {
      success: false,
      message: '发送失败'
    };
  }
};
