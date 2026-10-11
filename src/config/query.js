/**
 * 查询参数定义（前后端契约的一部分）
 *
 * 这里是「前端能发什么」的唯一来源：
 * 请求体字段、可选值、默认值全部从这里取，
 * 组件和 store 都不允许自己拼请求参数。
 */

/** 预测时长选项（value = 预测步数；采样间隔见 STEP_MINUTES） */
export const HORIZON_OPTIONS = [
  { label: '30 分钟', value: 6 },
  { label: '1 小时', value: 12 },
  { label: '2 小时', value: 24 },
  { label: '4 小时', value: 48 }
]

/** 历史窗口步数（固定近 2 小时） */
export const HISTORY_STEPS = 24

/** 采样间隔（分钟） */
export const STEP_MINUTES = 5

/** 天气情景可选值 */
export const WEATHER_OPTIONS = [
  { label: '晴', value: 'sunny' },
  { label: '多云', value: 'cloudy' },
  { label: '雨', value: 'rain' },
  { label: '雪', value: 'snow' }
]

/** 时段情景可选值 */
export const PEAK_OPTIONS = [
  { label: '不指定', value: 'none' },
  { label: '早高峰', value: 'am' },
  { label: '晚高峰', value: 'pm' }
]

/** 基准情景（不做任何 what-if 干预） */
export const DEFAULT_SCENARIO = {
  weather: 'sunny',
  holiday: false,
  peak: 'none'
}

/** 查询默认值 */
export const DEFAULT_FILTERS = {
  dataset: 'PeMS08',
  region: 'R01',
  horizon: 24,
  scenario: { ...DEFAULT_SCENARIO }
}

/** 数据集可选值 */
export const DATASET_OPTIONS = ['PeMS04', 'PeMS08', 'NYC-taxi']

/**
 * 由 filters 构造请求体。
 *
 * 【契约】/api/predict 与 /api/explain 使用同一套查询参数：
 *   { dataset, region, history, horizon, stepMin, scenario }
 * 后端不应依赖这里的默认值 —— 前端每次都会把所有字段发全。
 *
 * @param {{dataset:string, region:string, horizon?:number, scenario?:object}} filters
 */
export function buildQueryParams(filters) {
  return {
    dataset: filters.dataset,
    region: filters.region,
    history: HISTORY_STEPS,
    horizon: filters.horizon ?? 24,
    stepMin: STEP_MINUTES,
    scenario: { ...DEFAULT_SCENARIO, ...(filters.scenario || {}) }
  }
}

/** 判断是否为"基准情景"（三个维度都未施加干预） */
export function isBaselineScenario(scenario) {
  const s = { ...DEFAULT_SCENARIO, ...(scenario || {}) }
  return s.weather === 'sunny' && s.holiday === false && s.peak === 'none'
}

/** 把 horizon 步数转成可读文案，例如 24 -> "2 小时" */
export function horizonText(horizon) {
  const found = HORIZON_OPTIONS.find((o) => o.value === Number(horizon))
  if (found) return found.label
  return `${Number(horizon || 0) * STEP_MINUTES} 分钟`
}