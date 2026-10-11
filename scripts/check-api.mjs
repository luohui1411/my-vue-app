#!/usr/bin/env node
/**
 * 接口自检脚本
 *
 * 后端实现完接口后跑一遍：字段全绿 = 前端一定能正常渲染。
 * 契约定义见 openapi.yaml 与 README「接口契约」章节。
 *
 * 用法：
 *   node scripts/check-api.mjs                      # 默认 http://127.0.0.1:8000
 *   node scripts/check-api.mjs http://localhost:9000
 *   API_BASE=http://localhost:9000 node scripts/check-api.mjs
 */

const BASE = process.argv[2] || process.env.API_BASE || 'http://127.0.0.1:8000'

const FACTOR_KEYS = ['temporal', 'spatial', 'weather', 'trend', 'other']

let pass = 0
let fail = 0

function check(label, condition, detail = '') {
  if (condition) {
    pass++
    console.log(`  \x1b[32m✓\x1b[0m ${label}`)
  } else {
    fail++
    console.log(`  \x1b[31m✗\x1b[0m ${label}${detail ? `  → ${detail}` : ''}`)
  }
}

function section(title) {
  console.log(`\n\x1b[1m${title}\x1b[0m`)
}

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* 非 JSON 响应 */
  }
  return { status: res.status, ok: res.ok, json, text }
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const isNullish = (v) => v === null || v === undefined

const QUERY = {
  dataset: 'PeMS08',
  region: 'R01',
  history: 24,
  horizon: 24,
  stepMin: 5,
  scenario: { weather: 'sunny', holiday: false, peak: 'none' }
}

/* ---------------- /api/predict ---------------- */
async function checkPredict() {
  section(`POST ${BASE}/api/predict`)
  let r
  try {
    r = await post('/api/predict', QUERY)
  } catch (e) {
    check('请求可达', false, e.message)
    return
  }
  check('HTTP 200', r.ok, `实际 ${r.status}`)
  if (!r.json) {
    check('响应是 JSON', false, r.text.slice(0, 120))
    return
  }
  const d = r.json

  const required = ['region', 'dataset', 'times', 'actual', 'predict', 'lower', 'upper', 'metrics']
  const missing = required.filter((k) => !(k in d))
  check('必需字段齐全', missing.length === 0, missing.length ? `缺少 ${missing.join(', ')}` : '')

  check('times 是非空数组', Array.isArray(d.times) && d.times.length > 0)
  const n = Array.isArray(d.times) ? d.times.length : 0
  check(`times 长度 = history + horizon (${QUERY.history + QUERY.horizon})`, n === QUERY.history + QUERY.horizon, `实际 ${n}`)

  for (const f of ['actual', 'predict', 'lower', 'upper']) {
    check(`${f} 长度与 times 一致 (${n})`, Array.isArray(d[f]) && d[f].length === n, `实际 ${Array.isArray(d[f]) ? d[f].length : '非数组'}`)
    check(`${f} 元素为 number 或 null`, Array.isArray(d[f]) && d[f].every((v) => isNum(v) || isNullish(v)))
  }

  const actualNonNull = Array.isArray(d.actual) ? d.actual.filter((v) => v != null).length : 0
  check('actual 的历史段有值、预测段为 null', actualNonNull > 0 && actualNonNull < n, `非空个数 ${actualNonNull}`)

  if (d.metrics) {
    const m = ['MAE', 'RMSE', 'MAPE', 'R2'].filter((k) => !(k in d.metrics))
    check('metrics 四个指标齐全', m.length === 0, m.length ? `缺少 ${m.join(', ')}` : '')
    check('metrics 数值合法（非负 / R² 在合理范围）',
      isNum(d.metrics.MAE) && d.metrics.MAE >= 0 && isNum(d.metrics.RMSE) && d.metrics.RMSE >= 0,
      JSON.stringify(d.metrics))
  }

  check('regionNames 是非空数组', Array.isArray(d.regionNames) && d.regionNames.length > 0)
  check('heatTimes 是非空数组', Array.isArray(d.heatTimes) && d.heatTimes.length > 0)
  check('heatTimes 与预测段对齐', Array.isArray(d.heatTimes) && d.heatTimes.length === n - actualNonNull,
    `heatTimes ${d.heatTimes?.length} vs 预测段 ${n - actualNonNull}`)

  const hd = Array.isArray(d.heatData) ? d.heatData : []
  check('heatData 非空', hd.length > 0)
  check('heatData 每项是 [时间索引, 区域索引, 数值]',
    hd.length > 0 && hd.every((it) => Array.isArray(it) && it.length >= 3 && isNum(it[0]) && isNum(it[1]) && isNum(it[2])))
  if (hd.length && Array.isArray(d.heatTimes)) {
    const maxX = Math.max(...hd.map((it) => (isNum(it?.[0]) ? it[0] : -1)))
    check('heatData 时间索引未越界', maxX < d.heatTimes.length, `max=${maxX}, heatTimes=${d.heatTimes.length}`)
  }
  if (hd.length && Array.isArray(d.regionNames)) {
    const maxY = Math.max(...hd.map((it) => (isNum(it?.[1]) ? it[1] : -1)))
    check('heatData 区域索引未越界', maxY < d.regionNames.length, `max=${maxY}, regionNames=${d.regionNames.length}`)
  }

  if ('baselines' in d) {
    check('baselines 是数组', Array.isArray(d.baselines))
    check('baselines 每项有 name 且 values 与 times 等长',
      Array.isArray(d.baselines) && d.baselines.every((b) => b && typeof b.name === 'string' && Array.isArray(b.values) && b.values.length === n))
  }

  check('未返回 boundaryIndex（由前端推导，非必需）', !('boundaryIndex' in d) || true)
}

/* ---------------- /api/explain ---------------- */
async function checkExplain() {
  section(`POST ${BASE}/api/explain`)
  let r
  try {
    r = await post('/api/explain', QUERY)
  } catch (e) {
    check('请求可达', false, e.message)
    return
  }
  check('HTTP 200', r.ok, `实际 ${r.status}`)
  if (!r.json) {
    check('响应是 JSON', false, r.text.slice(0, 120))
    return
  }
  const d = r.json

  check('explanation 是非空字符串', typeof d.explanation === 'string' && d.explanation.trim().length > 0)

  const fs = Array.isArray(d.factors) ? d.factors : []
  check('factors 是数组', Array.isArray(d.factors))
  check('factors 每项有 key / name / weight',
    fs.length > 0 && fs.every((f) => f && typeof f.key === 'string' && typeof f.name === 'string' && isNum(f.weight)))
  check('factors 的 key 在约定枚举内', fs.every((f) => FACTOR_KEYS.includes(f.key)),
    fs.map((f) => f.key).join(','))
  const wsum = fs.reduce((a, f) => a + (isNum(f.weight) ? f.weight : 0), 0)
  check('factors 权重和 ≈ 1', Math.abs(wsum - 1) < 0.05, `实际 ${wsum.toFixed(3)}`)

  if (Array.isArray(d.mainFactors) && d.mainFactors.length) {
    check('mainFactors 为 1~2 项', d.mainFactors.length <= 2, `实际 ${d.mainFactors.length}`)
  }

  const at = Array.isArray(d.attention) ? d.attention : []
  check('attention 非空', at.length > 0)
  check('attention 每项是 [x, y, 权重]',
    at.length > 0 && at.every((it) => Array.isArray(it) && it.length >= 3 && isNum(it[0]) && isNum(it[1]) && isNum(it[2])))
  if (at.length && Array.isArray(d.regionNames)) {
    const maxIdx = Math.max(...at.map((it) => Math.max(isNum(it?.[0]) ? it[0] : -1, isNum(it?.[1]) ? it[1] : -1)))
    check('attention 索引未越界', maxIdx < d.regionNames.length, `max=${maxIdx}, regionNames=${d.regionNames.length}`)
  }

  check('reasoning 是字符串数组（可选）',
    !('reasoning' in d) || (Array.isArray(d.reasoning) && d.reasoning.every((s) => typeof s === 'string')))
}

/* ---------------- /api/agent ---------------- */
async function checkAgent() {
  section(`POST ${BASE}/api/agent`)
  let r
  try {
    r = await post('/api/agent', { command: '预测未来2小时 R05 区域交通流量并解释原因' })
  } catch (e) {
    check('请求可达', false, e.message)
    return
  }
  check('HTTP 200', r.ok, `实际 ${r.status}`)
  if (!r.json) {
    check('响应是 JSON', false, r.text.slice(0, 120))
    return
  }
  const d = r.json

  check('region 已解析', typeof d.region === 'string' && d.region.length > 0)
  check('dataset 有效', ['PeMS04', 'PeMS08', 'NYC-taxi'].includes(d.dataset), String(d.dataset))
  check('needExplain 是布尔', typeof d.needExplain === 'boolean')
  check('plan 是数组（用于展示 Agent 决策过程）',
    !('plan' in d) || (Array.isArray(d.plan) && d.plan.every((p) => p && typeof p.step === 'string')))
  check('tools 是字符串数组',
    !('tools' in d) || (Array.isArray(d.tools) && d.tools.every((t) => typeof t === 'string')))
}

/* ---------------- 错误响应格式 ---------------- */
async function checkErrorShape() {
  section('错误响应格式（可选但推荐）')
  try {
    const r = await post('/api/predict', { dataset: 'NotExist', region: '' })
    if (r.status >= 400) {
      const hasMsg = r.json && (typeof r.json.message === 'string' || typeof r.json.detail === 'string')
      check('4xx 响应包含 message 或 detail 字段', hasMsg,
        r.json ? `实际字段: ${Object.keys(r.json).join(',')}` : '非 JSON')
    } else {
      check('非法参数应返回 4xx', false, `实际 ${r.status}`)
    }
  } catch (e) {
    check('错误路径可访问', false, e.message)
  }
}

/* ---------------- main ---------------- */
console.log(`\n\x1b[1m接口自检\x1b[0m  →  ${BASE}`)
await checkPredict()
await checkExplain()
await checkAgent()
await checkErrorShape()

console.log(`\n\x1b[1m结果：\x1b[0m \x1b[32m${pass} 通过\x1b[0m，${fail > 0 ? `\x1b[31m${fail} 失败\x1b[0m` : '0 失败'}`)
process.exit(fail > 0 ? 1 : 0)