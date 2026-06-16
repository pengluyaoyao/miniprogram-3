/** 压缩后目标体积（留余量，同步 imgSecCheck 上限 1MB） */
const TARGET_MAX_BYTES = 800 * 1024
const INITIAL_QUALITY = 82
const MIN_QUALITY = 40

function getFileSize(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().getFileInfo({
      filePath,
      success: (res) => resolve(res.size || 0),
      fail: reject,
    })
  })
}

function compressOnce(
  src: string,
  options: { quality: number; compressedWidth?: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.compressImage({
      src,
      quality: options.quality,
      compressedWidth: options.compressedWidth,
      success: (res) => resolve(res.tempFilePath),
      fail: reject,
    })
  })
}

/** 上传前压缩，便于内容安全检测（含 imgSecCheck 同步兜底） */
export async function compressImageForCheck(src: string): Promise<string> {
  let current = src
  let quality = INITIAL_QUALITY
  const widthSteps = [undefined, 1920, 1280, 960] as const

  for (const width of widthSteps) {
    for (let round = 0; round < 3; round += 1) {
      current = await compressOnce(current, {
        quality,
        compressedWidth: width,
      })
      const size = await getFileSize(current)
      if (size <= TARGET_MAX_BYTES) {
        return current
      }
      quality = Math.max(MIN_QUALITY, quality - 12)
    }
    quality = INITIAL_QUALITY
  }
  return current
}

function uploadOne(filePath: string, folder: 'env' | 'pet'): Promise<string> {
  return new Promise((resolve, reject) => {
    const cloudPath = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: (u) => resolve(u.fileID),
      fail: reject,
    })
  })
}

/** 逐张压缩并上传云存储，返回 fileID 列表 */
export async function compressAndUploadImages(
  tempPaths: string[],
  folder: 'env' | 'pet'
): Promise<string[]> {
  const ids: string[] = []
  for (const path of tempPaths) {
    const compressed = await compressImageForCheck(path)
    const id = await uploadOne(compressed, folder)
    ids.push(id)
  }
  return ids
}
