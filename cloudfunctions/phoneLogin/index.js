// 手机号登录云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { phone, code } = event;
  const wxContext = cloud.getWXContext();

  try {
    // 这里应该验证短信验证码
    // 为了简化，我们假设验证码正确
    
    const openid = wxContext.OPENID;

    // 查找用户是否已存在
    const userResult = await db.collection('users').where({
      openid: openid
    }).get();

    let userInfo;

    if (userResult.data.length === 0) {
      // 新用户，创建用户记录
      const newUser = {
        openid: openid,
        nickname: '手机用户',
        avatar: '',
        phone: phone,
        stats: {
          posts: 0,
          likes: 0,
          follows: 0,
          collections: 0,
          comments: 0,
          analysis: 0
        },
        createTime: new Date(),
        updateTime: new Date()
      };

      const createResult = await db.collection('users').add({
        data: newUser
      });

      userInfo = {
        ...newUser,
        _id: createResult._id
      };
    } else {
      // 已存在用户，更新手机号
      const existingUser = userResult.data[0];
      await db.collection('users').doc(existingUser._id).update({
        data: {
          phone: phone,
          updateTime: new Date()
        }
      });

      userInfo = {
        ...existingUser,
        phone: phone
      };
    }

    return {
      success: true,
      userInfo: userInfo
    };

  } catch (error) {
    console.error('手机号登录失败:', error);
    return {
      success: false,
      message: '登录失败'
    };
  }
};
