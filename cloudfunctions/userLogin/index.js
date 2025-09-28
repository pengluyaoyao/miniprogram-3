// 用户登录云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { userProfile, code } = event;
  const wxContext = cloud.getWXContext();

  try {
    // 获取openid
    const openid = wxContext.OPENID;

    // 查找用户是否已存在
    const userResult = await db.collection('users').where({
      openid: openid
    }).get();

    let userInfo;
    let isNewUser = false;

    if (userResult.data.length === 0) {
      // 新用户，创建用户记录
      const newUser = {
        openid: openid,
        nickname: userProfile.nickName || '风水爱好者',
        avatar: userProfile.avatarUrl || '',
        gender: userProfile.gender || 0,
        city: userProfile.city || '',
        province: userProfile.province || '',
        country: userProfile.country || '',
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
      isNewUser = true;
    } else {
      // 已存在用户，更新信息
      const existingUser = userResult.data[0];
      const updateData = {
        nickname: userProfile.nickName || existingUser.nickname,
        avatar: userProfile.avatarUrl || existingUser.avatar,
        updateTime: new Date()
      };

      await db.collection('users').doc(existingUser._id).update({
        data: updateData
      });

      userInfo = {
        ...existingUser,
        ...updateData
      };
    }

    return {
      success: true,
      userInfo: userInfo,
      isNewUser: isNewUser
    };

  } catch (error) {
    console.error('用户登录失败:', error);
    return {
      success: false,
      message: '登录失败'
    };
  }
};
