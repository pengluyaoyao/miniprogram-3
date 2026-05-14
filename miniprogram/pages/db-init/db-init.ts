import { callCloud } from '../../utils/cloud'

Page({
  data: {
    log: '',
    loading: false
  },

  runInit() {
    this.setData({ loading: true, log: '请求中…' })
    callCloud('initDatabase', { confirm: 'INIT_DB_V1' })
      .then((res) => {
        this.setData({
          log: JSON.stringify(res.result, null, 2),
          loading: false
        })
      })
      .catch((err: { errMsg?: string }) => {
        this.setData({
          log: `调用失败：${err.errMsg || ''}\n${JSON.stringify(err, null, 2)}`,
          loading: false
        })
      })
  }
})
