/**
 * 编辑 miniprogram/data/regions.json 后运行：
 *   node scripts/sync-regions-data.js
 * 同步生成 miniprogram/data/regionsData.ts 与 cloudfunctions/publishListing/regions.json
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const jsonPath = path.join(root, 'miniprogram/data/regions.json')
const tsPath = path.join(root, 'miniprogram/data/regionsData.ts')
const cloudPath = path.join(root, 'cloudfunctions/publishListing/regions.json')

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
const tsBody = `/** 自动生成，请勿手改。请编辑 regions.json 后运行: node scripts/sync-regions-data.js */
import type { CityRegion } from '../utils/districts-types'

export const REGIONS_DATA: CityRegion[] = ${JSON.stringify(data, null, 2)}
`
fs.writeFileSync(tsPath, tsBody)
fs.writeFileSync(cloudPath, JSON.stringify(data, null, 2) + '\n')
console.log(`Synced ${data.length} cities -> regionsData.ts & publishListing/regions.json`)
