/**
 * 在云数据库中创建 PRD 第八节所列集合。
 *
 * 部分 CloudBase / 微信云开发环境下，集合必须先显式 createCollection，
 * 仅靠 document.set 无法自动建表（会报 DATABASE_COLLECTION_NOT_EXIST / -502005）。
 *
 * 流程：@cloudbase/node-sdk createCollection → wx-server-sdk 写入元数据文档
 */
const cloud = require('wx-server-sdk')
const tcb = require('@cloudbase/node-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const wxDb = cloud.database()

const app = tcb.init({
  env: tcb.SYMBOL_CURRENT_ENV,
})
const tcbDb = app.database()

const META_DOC_ID = 'prd_section8_meta'

const COLLECTIONS = [
  'users',
  'pets',
  'boarding_requests',
  'provider_profiles',
  'contact_logs',
  'profile_view_logs',
  'view_entitlements',
  'payment_orders',
  'favorites',
  'reports',
  'chat_threads',
  'chat_messages',
]

function isCollectionAlreadyExistsError(err) {
  const msg = (err && (err.message || err.errMsg || '')) + String(err && err.code)
  return /already exist|已存在|duplicate|EXIST|ResourceInUse|50200[1-9]/i.test(msg)
}

exports.main = async (event) => {
  if (event.confirm !== 'INIT_DB_V1') {
    return {
      ok: false,
      errMsg: '请传入 data.confirm === "INIT_DB_V1" 以确认执行初始化（防止误触）',
    }
  }

  const results = []

  for (const name of COLLECTIONS) {
    try {
      try {
        await tcbDb.createCollection(name)
      } catch (createErr) {
        if (!isCollectionAlreadyExistsError(createErr)) {
          throw createErr
        }
      }

      await wxDb
        .collection(name)
        .doc(META_DOC_ID)
        .set({
          data: {
            _schemaInit: true,
            prdSection: 8,
            description: '集合元数据，可删',
            updated_at: wxDb.serverDate(),
          },
        })

      results.push({ collection: name, ok: true })
    } catch (err) {
      results.push({
        collection: name,
        ok: false,
        error: err.message || err.errMsg || String(err),
      })
    }
  }

  return {
    ok: results.every((r) => r.ok),
    results,
    hint: '若仍失败，请在控制台「数据库」手动添加同名集合后重试。',
  }
}
