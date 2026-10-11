/**
 * 演示数据生成器
 *
 * 重要：这个文件同时充当「接口契约的可执行参考实现」——
 * 后端返回的结构应与这里完全一致，字段含义见 README 的接口契约章节。
 *
 * 注意：这里**不返回 boundaryIndex**，因为该值由前端根据 actual 自行推导，
 * 不要求后端提供（见 api/adapters.js）。
 */
import { computeMetrics } from '../utils/metrics'
import { DEFAULT_SCENARIO, STEP_MINUTES } from '../config/query'
import { FACTOR_CATEGORIES } from '../config/factors'

/* ---------- 工具函数 ---------- */
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashCode(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return h >>> 0
}

const pad = (n) => String(n).padStart(2, '0')
const round1 = (n) => +n.toFixed(3)

export function makeRegions(count = 12) {
  return Array.from({ length: count }, (_, i) => `R${pad(i + 1)}`)
}

/**
 * 情景 -> 数值影响
 * 基线（晴 / 非节假日 / 不指定时段）时 scale=1、noise=1，即不做干预。
 */
function applyScenario(scenario) {
  const s = { ...DEFAULT_SCENARIO, ...(scenario || {}) }
  let scale = 1
  let noise = 1

  if (s.weather === 'rain') {
    scale *= 0.92
    noise = 1.35
  } else if (s.weather === 'snow') {
    scale *= 0.82
    noise = 1.55
  } else if (s.weather === 'cloudy') {
    scale *= 0.97
    noise = 1.1
  }

  if (s.holiday) {
    scale *= 0.78
    noise *= 1.15
  }

  if (s.peak === 'am') scale *= 1.18
  else if (s.peak === 'pm') scale *= 1.12

  return { scale, noise, scenario: s }
}

/* ---------- 预测结果 Mock ---------- */
export function makeMockPrediction({
  region = 'R01',
  dataset = 'PeMS08',
  history = 24,
  horizon = 24,
  stepMin = STEP_MINUTES,
  scenario = null
} = {}) {
  // 注意：种子不含 scenario —— 切换情景时基础序列不变，
  // 只有预测段按比例平移，这样"情景带来的变化"在图上看得清楚。
  const rand = mulberry32(hashCode(`${region}|${dataset}|${history}|${horizon}`))
  const { scale, noise, scenario: s } = applyScenario(scenario)

  const now = new Date()
  now.setSeconds(0, 0)
  now.setMinutes(Math.floor(now.getMinutes() / stepMin) * stepMin)

  const start = new Date(now.getTime() - (history - 1) * stepMin * 60000)
  const total = history + horizon
  const times = []
  for (let i = 0; i < total; i++) {
    const t = new Date(start.getTime() + i * stepMin * 60000)
    times.push(`${pad(t.getHours())}:${pad(t.getMinutes())}`)
  }

  const base = 320 + rand() * 180
  const amp = 60 + rand() * 90
  const phase = rand() * Math.PI * 2

  const actual = []
  const predict = []
  const lower = []
  const upper = []
  const backtest = [] // 历史段的模型回测值，仅用于计算指标
  const truthFuture = [] // 未来段"真值"（仅用于生成对比基线）

  for (let i = 0; i < total; i++) {
    const daily = Math.sin((i / total) * Math.PI * 2 + phase)
    const wave = Math.sin(i * 0.55) * 0.4 + Math.sin(i * 0.17) * 0.7
    const isFuture = i >= history
    // 情景只作用于未来段：历史是既定观测，未来才是 what-if 的对象
    const effScale = isFuture ? scale : 1
    const effNoise = isFuture ? noise : 1
    const truth = (base + amp * daily + 28 * wave) * effScale + (rand() - 0.5) * 16 * effNoise

    if (!isFuture) {
      const v = Math.round(Math.max(0, truth))
      actual.push(v)
      backtest.push(Math.round(Math.max(0, truth + (rand() - 0.5) * 34)))
      if (i === history - 1) {
        predict.push(v)
        lower.push(Math.round(v * 0.9))
        upper.push(Math.round(v * 1.1))
      } else {
        predict.push(null)
        lower.push(null)
        upper.push(null)
      }
    } else {
      actual.push(null)
      truthFuture.push(truth)
      const pred = truth + (rand() - 0.5) * 22 * noise + 30 * Math.sin(i * 0.23)
      const p = Math.round(Math.max(0, pred))
      predict.push(p)
      const spread = 24 * noise + rand() * 30 + (i - history) * 1.6
      lower.push(Math.round(Math.max(0, p - spread)))
      upper.push(Math.round(p + spread))
    }
  }

  // 指标由历史段「观测 vs 回测」真实计算（口径见 utils/metrics.js）
  const metrics = computeMetrics(actual.slice(0, history), backtest)

  // ── 对比基线 ──────────────────────────────────────────────
  // 只覆盖未来段，历史段填 null。
  const histValues = actual.slice(0, history).filter((v) => v != null)
  const persistence = histValues.length
    ? Math.round(histValues.reduce((a, b) => a + b, 0) / histValues.length)
    : 0
  const bRand = mulberry32(hashCode(`bl|${region}|${dataset}|${horizon}`))

  const arima = times.map(() => null)
  const persist = times.map(() => null)
  for (let i = history; i < total; i++) {
    // ARIMA：更平滑、误差更大，且会"滞后"于峰值
    arima[i] = Math.round(Math.max(0, truthFuture[i - history] * 0.94 + (bRand() - 0.5) * 55))
    persist[i] = persistence
  }

  const baselines = [
    { name: 'ARIMA', values: arima },
    { name: '历史均值', values: persist }
  ]

  // ── 区域热力图 ──────────────────────────────────────────────
  // 与折线图同源：选中区域的未来流量直接取预测值。
  const regionNames = makeRegions(12)
  const heatTimes = times.slice(history, total)
  const futureValues = predict.slice(history)
  const heatData = []

  regionNames.forEach((name, y) => {
    const rr = mulberry32(hashCode(`${name}|${dataset}`))
    const isTarget = name === region
    const factor = 0.55 + rr() * 0.9

    heatTimes.forEach((_, x) => {
      const baseValue = futureValues[x] ?? 0
      const value = isTarget
        ? baseValue
        : Math.round(Math.max(0, baseValue * factor * (1 + (rr() - 0.5) * 0.16)))
      heatData.push([x, y, value])
    })
  })

  return {
    region,
    dataset,
    scenario: s,
    times,
    actual,
    predict,
    lower,
    upper,
    baselines,
    regionNames,
    heatTimes,
    heatData,
    metrics
  }
}

/* ---------- 可解释性 Mock ---------- */
export function makeMockExplanation({
  region = 'R01',
  dataset = 'PeMS08',
  horizon = 24,
  scenario = null
} = {}) {
  const rand = mulberry32(hashCode(`ex|${region}|${dataset}|${horizon}`))
  const { scenario: s } = applyScenario(scenario)

  // 四类因子权重（归一化到 1），场景会改变权重分布
  const raw = {
    temporal: 0.34 + (s.peak === 'none' ? 0 : 0.08),
    spatial: 0.27,
    weather: 0.12 + (s.weather === 'sunny' ? 0 : s.weather === 'cloudy' ? 0.06 : 0.16),
    trend: 0.18
  }
  const sum = Object.values(raw).reduce((a, b) => a + b, 0)

  const factors = FACTOR_CATEGORIES.map(({ key, name }) => ({
    key,
    name,
    weight: round1((raw[key] * (0.9 + rand() * 0.2)) / sum)
  })).sort((a, b) => b.weight - a.weight)

  // 重新归一化，保证权重和为 1（契约要求）
  const wsum = factors.reduce((a, b) => a + b.weight, 0)
  factors.forEach((f) => {
    f.weight = round1(f.weight / wsum)
  })

  const mainFactors = factors.slice(0, 2)

  const regionNames = makeRegions(12)
  const attention = []
  for (let y = 0; y < regionNames.length; y++) {
    for (let x = 0; x < regionNames.length; x++) {
      const v =
        x === y ? 1 : Math.max(0, Math.exp(-Math.abs(y - x) / 2.2) * (0.5 + rand() * 0.5))
      attention.push([x, y, round1(v)])
    }
  }

  const horizonLabel = `${(horizon * STEP_MINUTES) / 60} 小时`
  const scenarioDesc = []
  if (s.weather !== 'sunny') {
    scenarioDesc.push({ rain: '降雨', snow: '降雪', cloudy: '多云' }[s.weather] || s.weather)
  }
  if (s.holiday) scenarioDesc.push('节假日')
  if (s.peak === 'am') scenarioDesc.push('早高峰')
  if (s.peak === 'pm') scenarioDesc.push('晚高峰')
  const scenarioLabel = scenarioDesc.length ? `在「${scenarioDesc.join(' + ')}」情景下，` : ''

  const explanation =
    `${scenarioLabel}未来 ${horizonLabel} ${region} 区域交通流量预计整体呈"先上升、后回落"的变化态势，` +
    `主要受「${mainFactors[0].name}」与「${mainFactors[1].name}」共同驱动。` +
    `其中，${mainFactors[0].name} 贡献度最高（${(mainFactors[0].weight * 100).toFixed(1)}%），` +
    `${mainFactors[1].name} 次之（${(mainFactors[1].weight * 100).toFixed(1)}%），` +
    `表明相邻路段的车流传导对该区域存在明显的溢出效应。` +
    `建议在该时段提前进行信号配时优化与拥堵疏导，以降低峰值时段的通行压力。`

  const reasoning = [
    `步骤 1｜意图解析：识别任务为"交通流量预测 + 原因解释"，目标区域 ${region}，预测跨度未来 ${horizonLabel}。`,
    '步骤 2｜数据准备：取用历史流量序列，并对齐天气、节假日、PoI 等外部特征。',
    '步骤 3｜模型推理：时空依赖编码器 + LLM 回归头输出连续数值预测，并给出 95% 置信区间。',
    '步骤 4｜因子归因：计算四类影响因子权重，筛选出 Top-2 主要影响因子。',
    '步骤 5｜解释生成：以 Top-2 因子为锚点，结合 GPT-2 中间层注意力权重生成自然语言解释。'
  ]

  return {
    intent: `预测未来 ${horizonLabel} ${region} 区域交通流量，并解释主要影响因素`,
    parsed: {
      task: '交通流量预测',
      region,
      horizon: `未来 ${horizonLabel}`,
      needExplain: true,
      dataset,
      scenario: s
    },
    mainFactors,
    factors,
    attention,
    regionNames,
    explanation,
    reasoning
  }
}