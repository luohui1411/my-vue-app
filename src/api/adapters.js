/**
 * 数据适配层：把「后端原始返回」规范化成「前端视图模型」。
 *
 * 这是整个前端唯一允许了解后端字段名的地方。
 * 后端字段变了 -> 只改这里；组件永远消费 types/models.js 里的视图模型。
 *
 * 同时承担两件事：
 * 1. 防御性处理：字段缺失时给安全默认值，避免图表直接崩掉；
 * 2. 契约校验（仅开发环境）：发现后端返回不符合约定时打警告，
 *    避免"静默画错"这类最难排查的问题。
 */
import { FACTOR_CATEGORIES, FACTOR_KEYS } from '../config/factors'

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const asArray = (v, fallback = []) => (Array.isArray(v) ? v : fallback)

function asMetric(v) {
  if (isNum(v)) return v
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * 是否输出契约告警。
 * - Vite 开发环境：跟随 import.meta.env.DEV（生产构建时为 false）
 * - 其他环境（Node 脚本 / 测试）：可用 globalThis.__CONTRACT_WARN__ = true 显式开启
 */
function shouldWarn() {
  if (globalThis.__CONTRACT_WARN__ === true) return true
  try {
    return Boolean(import.meta.env && import.meta.env.DEV)
  } catch {
    return false
  }
}

/** 契约告警：把"静默画错"变成"控制台可见" */
function devWarn(message) {
  if (shouldWarn()) console.warn(`[契约校验] ${message}`)
}

/**
 * 推导「预测起点」下标 = actual 中最后一个非空值的下标。
 *
 * 【契约】后端不需要返回 boundaryIndex，前端自己算。
 * 这样既少了字段耦合，也能容忍后端返回的实际步数与请求不完全一致。
 */
function findBoundaryIndex(actual, times) {
  for (let i = Math.min(actual.length, times.length) - 1; i >= 0; i--) {
    if (actual[i] != null) return i
  }
  // actual 全为空：退化成"前半段是历史"
  return Math.max(0, Math.floor(times.length / 2) - 1)
}

/** 基线序列：补齐长度、过滤非法值 */
function normalizeBaselines(rawBaselines, length) {
  return asArray(rawBaselines)
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const values = asArray(item.values)
      if (values.length && values.length !== length) {
        devWarn(`baselines「${item.name}」长度 ${values.length} 与 times 长度 ${length} 不一致`)
      }
      return {
        name: String(item.name ?? '基线'),
        values: Array.from({ length }, (_, i) => {
          const v = values[i]
          return isNum(v) ? v : null
        })
      }
    })
    .filter(Boolean)
}

/**
 * 因子归一化：保证四类固定类别都在，权重和为 1，未知因子追加在后。
 */
function normalizeFactors(rawFactors) {
  const byKey = new Map()
  const extras = []

  for (const item of asArray(rawFactors)) {
    if (!item || typeof item !== 'object') continue
    const rawKey = typeof item.key === 'string' ? item.key : ''
    const known = FACTOR_KEYS.includes(rawKey)
    const cat = known ? FACTOR_CATEGORIES.find((c) => c.key === rawKey) : null
    const factor = {
      key: known ? rawKey : 'other',
      name: String(item.name ?? cat?.name ?? '-'),
      weight: Number.isFinite(Number(item.weight)) ? Number(item.weight) : 0
    }
    if (known) {
      if (byKey.has(rawKey)) devWarn(`factors 中 key="${rawKey}" 重复，后面的覆盖前面的`)
      byKey.set(rawKey, factor)
    } else {
      if (rawKey) devWarn(`factors 中出现未知 key="${rawKey}"，将追加在四类之后`)
      extras.push(factor)
    }
  }

  const missing = FACTOR_KEYS.filter((k) => !byKey.has(k))
  if (missing.length) devWarn(`factors 缺少类别 ${missing.join(', ')}，已补 0`)

  const list = FACTOR_CATEGORIES.map(
    (c) => byKey.get(c.key) ?? { key: c.key, name: c.name, weight: 0 }
  )
  list.push(...extras)

  // 权重应归一化到 1；偏离明显时纠正并告警
  const sum = list.reduce((a, f) => a + f.weight, 0)
  if (sum > 0 && Math.abs(sum - 1) > 0.02) {
    devWarn(`factors 权重和为 ${sum.toFixed(3)}，偏离 1，已自动归一化`)
    list.forEach((f) => {
      f.weight = +(f.weight / sum).toFixed(3)
    })
  }
  return list
}

/** 校验预测返回的长度约束（契约要求四条序列与 times 等长） */
function validatePrediction(vm) {
  const n = vm.times.length
  for (const field of ['actual', 'predict', 'lower', 'upper']) {
    if (vm[field].length !== n) {
      devWarn(`${field} 长度 ${vm[field].length} 与 times 长度 ${n} 不一致，图表可能出现错位`)
    }
  }
  if (vm.heatData.length && !vm.heatTimes.length) {
    devWarn('返回了 heatData 但缺少 heatTimes，热力图横轴无法对齐')
  }
  if (vm.heatData.length && !vm.regionNames.length) {
    devWarn('返回了 heatData 但缺少 regionNames，热力图纵轴无法对齐')
  }
  const badHeat = vm.heatData.filter(
    (d) => !Array.isArray(d) || d.length < 3 || !isNum(d[0]) || !isNum(d[1]) || !isNum(d[2])
  )
  if (badHeat.length) {
    devWarn(`heatData 有 ${badHeat.length} 项不是 [时间索引, 区域索引, 数值] 结构`)
  }
  const maxX = vm.heatData.reduce((m, d) => (Array.isArray(d) && isNum(d[0]) ? Math.max(m, d[0]) : m), -1)
  if (maxX >= 0 && vm.heatTimes.length && maxX >= vm.heatTimes.length) {
    devWarn(`heatData 的时间索引最大为 ${maxX}，超出 heatTimes 长度 ${vm.heatTimes.length}`)
  }
  const maxY = vm.heatData.reduce((m, d) => (Array.isArray(d) && isNum(d[1]) ? Math.max(m, d[1]) : m), -1)
  if (maxY >= 0 && vm.regionNames.length && maxY >= vm.regionNames.length) {
    devWarn(`heatData 的区域索引最大为 ${maxY}，超出 regionNames 长度 ${vm.regionNames.length}
`)
  }
}

/**
 * 原始预测返回 -> PredictionViewModel
 * @param {any} raw
 * @returns {import('../types/models').PredictionViewModel}
 */
export function toPredictionViewModel(raw = {}) {
  const times = asArray(raw.times)
  const fillNull = () => times.map(() => null)
  const actual = asArray(raw.actual, fillNull())

  const vm = {
    region: String(raw.region ?? '-'),
    dataset: String(raw.dataset ?? '-'),
    scenario: raw.scenario && typeof raw.scenario === 'object' ? raw.scenario : null,
    times,
    // 由 actual 推导，不依赖后端返回
    boundaryIndex: findBoundaryIndex(actual, times),
    actual,
    predict: asArray(raw.predict, fillNull()),
    lower: asArray(raw.lower, fillNull()),
    upper: asArray(raw.upper, fillNull()),
    baselines: normalizeBaselines(raw.baselines, times.length),
    regionNames: asArray(raw.regionNames),
    heatTimes: asArray(raw.heatTimes),
    heatData: asArray(raw.heatData),
    metrics: {
      MAE: asMetric(raw.metrics?.MAE),
      RMSE: asMetric(raw.metrics?.RMSE),
      MAPE: asMetric(raw.metrics?.MAPE),
      R2: asMetric(raw.metrics?.R2)
    }
  }

  validatePrediction(vm)
  return vm
}

/**
 * 原始解释返回 -> ExplanationViewModel
 * @param {any} raw
 * @returns {import('../types/models').ExplanationViewModel}
 */
export function toExplanationViewModel(raw = {}) {
  const factors = normalizeFactors(raw.factors)
  const declaredMain = asArray(raw.mainFactors).map((f) => ({
    key: 'other',
    name: String(f?.name ?? '-'),
    weight: Number.isFinite(Number(f?.weight)) ? Number(f.weight) : 0
  }))

  return {
    intent: String(raw.intent ?? ''),
    parsed: {
      task: '-',
      region: '-',
      horizon: '-',
      needExplain: false,
      dataset: '-',
      ...(raw.parsed || {})
    },
    // 后端没给 mainFactors 时，退化为因子权重 Top-2
    mainFactors: declaredMain.length
      ? declaredMain
      : [...factors].sort((a, b) => b.weight - a.weight).slice(0, 2),
    factors,
    attention: asArray(raw.attention),
    regionNames: asArray(raw.regionNames),
    explanation: String(raw.explanation ?? '暂无解释文本'),
    reasoning: asArray(raw.reasoning)
  }
}