// 初始化数据库云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const collections = [
    'users',           // 用户集合
    'sms_codes',       // 短信验证码集合
    'house_analysis',  // 户型分析集合
    'posts',           // 社区帖子集合
    'comments',        // 评论集合
    'collections',     // 收藏集合
    'likes',           // 点赞集合
    'notifications'    // 消息通知集合
  ];

  const results = [];

  try {
    for (const collectionName of collections) {
      try {
        await db.createCollection(collectionName);
        console.log(`${collectionName} 集合创建成功`);
        results.push({ collection: collectionName, status: 'success' });
      } catch (error) {
        if (error.errCode === -1) {
          // 集合已存在
          console.log(`${collectionName} 集合已存在`);
          results.push({ collection: collectionName, status: 'exists' });
        } else {
          console.error(`${collectionName} 集合创建失败:`, error);
          results.push({ collection: collectionName, status: 'failed', error: error.message });
        }
      }
    }

    // 创建索引（可选）
    await createIndexes();

    return {
      success: true,
      message: '数据库初始化完成',
      results: results
    };

  } catch (error) {
    console.error('数据库初始化失败:', error);
    return {
      success: false,
      message: '数据库初始化失败: ' + error.message,
      results: results
    };
  }
};

// 创建索引函数
async function createIndexes() {
  try {
    // 用户集合索引
    await db.collection('users').createIndex({
      keys: { _openid: 1 },
      unique: true
    });

    // 户型分析集合索引
    await db.collection('house_analysis').createIndex({
      keys: { _openid: 1, createTime: -1 }
    });

    // 帖子集合索引
    await db.collection('posts').createIndex({
      keys: { status: 1, createTime: -1 }
    });

    // 评论集合索引
    await db.collection('comments').createIndex({
      keys: { postId: 1, createTime: -1 }
    });

    // 收藏集合索引
    await db.collection('collections').createIndex({
      keys: { _openid: 1, createTime: -1 }
    });

    // 点赞集合索引
    await db.collection('likes').createIndex({
      keys: { _openid: 1, targetType: 1, targetId: 1 },
      unique: true
    });

    // 通知集合索引
    await db.collection('notifications').createIndex({
      keys: { _openid: 1, isRead: 1, createTime: -1 }
    });

    console.log('索引创建完成');
  } catch (error) {
    console.error('索引创建失败:', error);
  }
}
