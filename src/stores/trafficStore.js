/**
 * 轻量共享状态（不依赖 Pinia，后续要迁移也很容易）
 *
 * 设计要点：
 * 1. 每个数据资源有独立的 { data, loading, error }，互不阻塞；
 * 2. 新增一类数据 = 在 RESOURCES 里加一行，其余自动搞定；
 * 3. 每个资源带请求序号保护：过期响应会被丢弃，避免"慢的请求盖掉快的"；
 * 4. 请求参数统一由 config/query.js 的 buildQueryParams 构造，
 *    保证"文档里写的字段"和"实际发出的字段"永远一致。
 */
import { reactive } from 'vue'
import { api, MODE } from '../api'
import { toPredictionViewModel, toExplanationViewModel } from '../api/adapters'
import { buildQueryParams, DEFAULT_FILTERS, DEFAULT_SCENARIO } from '../config/query'

/**
 * 数据资源注册表
 * key       = 资源名（出现在 store.resources[key]）
 * label     = 界面提示用的中文名
 * fetch     = 拉取原始数据（统一走 buildQueryParams）
 * normalize = 原始数据 -> 视图模型（统一由 adapters.js 提供）
 */
const RESOURCES = {
  prediction: {
    label: '流量预测',
    fetch: (filters) => api.predict(buildQueryParams(filters)),
    normalize: toPredictionViewModel
  },
  explanation: {
    label: '可解释性分析',
    fetch: (filters) => api.explain(buildQueryParams(filters)),
    normalize: toExplanationViewModel
  }
}

/** 所有资源名，供外部遍历 */
export const RESOURCE_NAMES = Object.keys(RESOURCES)

/** 资源名 -> 中文标签 */
export const RESOURCE_LABELS = Object.fromEntries(
  Object.entries(RESOURCES).map(([name, def]) => [name, def.label])
)

function createTrafficStore() {
  const store = reactive({
    /** 当前数据源：'mock' | 'http' */
    mode: MODE,
    /** 查询条件：{ dataset, region, horizon, scenario } */
    filters: {
      ...DEFAULT_FILTERS,
      scenario: { ...DEFAULT_SCENARIO }
    },
    /** 各资源槽位：{ prediction: { data, loading, error }, ... } */
    resources: {},
    /** 最近一次自然语言指令与 Agent 解析结果 */
    command: { text: '', parsed: null, plan: [], tools: [] },
    /** 是否有任意资源在加载 */
    isLoading: false
  })

  /** 每个资源最近一次请求的序号，用于丢弃过期响应 */
  const requestSeq = {}

  RESOURCE_NAMES.forEach((name) => {
    store.resources[name] = { data: null, loading: false, error: null }
    requestSeq[name] = 0
  })

  function syncLoading() {
    store.isLoading = RESOURCE_NAMES.some((name) => store.resources[name].loading)
  }

  /**
   * 加载单个资源
   * @returns {Promise<boolean>} 是否成功（过期响应按成功处理，因为有更新的请求在跑）
   */
  async function loadResource(name) {
    const def = RESOURCES[name]
    const slot = store.resources[name]
    if (!def || !slot) return true

    const reqId = (requestSeq[name] += 1)

    slot.loading = true
    slot.error = null
    syncLoading()

    try {
      const raw = await def.fetch(store.filters)
      if (reqId !== requestSeq[name]) return true
      slot.data = def.normalize(raw)
      return true
    } catch (e) {
      if (reqId !== requestSeq[name]) return true
      slot.error = e?.message || String(e)
      return false
    } finally {
      if (reqId === requestSeq[name]) {
        slot.loading = false
        syncLoading()
      }
    }
  }

  /**
   * 加载全部资源（并行）
   * @returns {Promise<{ok: boolean, failed: string[]}>}
   */
  async function loadAll() {
    const results = await Promise.all(RESOURCE_NAMES.map((name) => loadResource(name)))
    const failed = RESOURCE_NAMES.filter((name, i) => results[i] === false)
    return { ok: failed.length === 0, failed }
  }

  /** 修改顶层查询条件（dataset / region / horizon）并刷新 */
  function setFilter(key, value) {
    if (store.filters[key] === value) return Promise.resolve({ ok: true, failed: [] })
    store.filters[key] = value
    return loadAll()
  }

  /** 修改情景条件（weather / holiday / peak）并刷新 */
  function setScenario(key, value) {
    if (store.filters.scenario[key] === value) return Promise.resolve({ ok: true, failed: [] })
    store.filters.scenario = { ...store.filters.scenario, [key]: value }
    return loadAll()
  }

  /** 重置为基准情景 */
  function resetScenario() {
    store.filters.scenario = { ...DEFAULT_SCENARIO }
    return loadAll()
  }

  /** 提交自然语言指令：先解析意图，再刷新数据 */
  async function applyCommand(text) {
    store.command.text = text
    let parsed = null
    try {
      parsed = await api.agent(text)
      store.command.parsed = parsed
      store.command.plan = Array.isArray(parsed?.plan) ? parsed.plan : []
      store.command.tools = Array.isArray(parsed?.tools) ? parsed.tools : []
    } catch (e) {
      store.command.parsed = { error: e?.message || String(e) }
      store.command.plan = []
      store.command.tools = []
    }

    if (parsed?.region) store.filters.region = parsed.region
    if (parsed?.dataset) store.filters.dataset = parsed.dataset
    if (parsed?.horizon) store.filters.horizon = parsed.horizon
    if (parsed?.scenario) store.filters.scenario = { ...DEFAULT_SCENARIO, ...parsed.scenario }

    const result = await loadAll()
    return { parsed, ...result }
  }

  store.loadResource = loadResource
  store.loadAll = loadAll
  store.setFilter = setFilter
  store.setScenario = setScenario
  store.resetScenario = resetScenario
  store.applyCommand = applyCommand

  return store
}

export const trafficStore = createTrafficStore()

export function useTrafficStore() {
  return trafficStore
}