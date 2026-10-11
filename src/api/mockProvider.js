// Mock 数据源：不依赖任何后端服务
import { makeMockPrediction, makeMockExplanation } from '../mock/mockData'
import { DEFAULT_SCENARIO, HORIZON_OPTIONS, STEP_MINUTES } from '../config/query'

const delay = () => new Promise((r) => setTimeout(r, 280 + Math.random() * 420))

/** 从自然语言里抽取预测跨度（步数） */
function parseHorizon(text) {
  const hour = text.match(/(\d+(?:\.\d+)?)\s*(?:个)?\s*小时/)
  if (hour) {
    const steps = Math.round((Number(hour[1]) * 60) / STEP_MINUTES)
    return HORIZON_OPTIONS.find((o) => o.value === steps)?.value ?? 24
  }
  const min = text.match(/(\d+)\s*分钟/)
  if (min) {
    const steps = Math.round(Number(min[1]) / STEP_MINUTES)
    return HORIZON_OPTIONS.find((o) => o.value === steps)?.value ?? 24
  }
  return 24
}

/** 从自然语言里抽取情景 */
function parseScenario(text) {
  const s = { ...DEFAULT_SCENARIO }
  if (/雨/.test(text)) s.weather = 'rain'
  else if (/雪/.test(text)) s.weather = 'snow'
  else if (/多云|阴/.test(text)) s.weather = 'cloudy'
  if (/节假日|假期|放假/.test(text)) s.holiday = true
  if (/早高峰/.test(text)) s.peak = 'am'
  else if (/晚高峰/.test(text)) s.peak = 'pm'
  return s
}

/**
 * Mock Provider，返回与真实后端完全一致的「原始数据结构」。
 * 规范化交给 adapters.js 统一处理，保证两条链路行为一致。
 */
export function createMockProvider() {
  return {
    name: 'mock',

    async predict(params) {
      await delay()
      return makeMockPrediction(params)
    },

    async explain(params) {
      await delay()
      return makeMockExplanation(params)
    },

    /**
     * 模拟 LLM Agent 的意图解析。
     * 【契约】返回 region / dataset / horizon / scenario / needExplain，
     * 并附 tools（调用了哪些工具）与 plan（执行计划），供界面展示 Agent 的决策过程。
     */
    async agent(command) {
      await delay()
      const c = String(command || '')

      const regionMatch = c.match(/R\s*(\d{1,2})/i)
      const region = regionMatch ? `R${String(regionMatch[1]).padStart(2, '0')}` : 'R01'

      let dataset = 'PeMS08'
      if (/pems04/i.test(c)) dataset = 'PeMS04'
      else if (/nyc/i.test(c)) dataset = 'NYC-taxi'

      const horizon = parseHorizon(c)
      const scenario = parseScenario(c)
      const needExplain = /解释|原因|为什么|因素/.test(c)

      const scenarioBits = []
      if (scenario.weather !== 'sunny') {
        scenarioBits.push({ rain: '降雨', snow: '降雪', cloudy: '多云' }[scenario.weather])
      }
      if (scenario.holiday) scenarioBits.push('节假日')
      if (scenario.peak === 'am') scenarioBits.push('早高峰')
      if (scenario.peak === 'pm') scenarioBits.push('晚高峰')

      const horizonLabel = HORIZON_OPTIONS.find((o) => o.value === horizon)?.label ?? `${horizon} 步`

      const tools = ['predict_traffic']
      if (needExplain) tools.push('explain_attribution')

      const plan = [
        { step: '意图解析', detail: `识别为交通流量预测任务，目标区域 ${region}，跨度 ${horizonLabel}` },
        {
          step: '情景识别',
          detail: scenarioBits.length ? `附加条件：${scenarioBits.join(' + ')}` : '未附加特殊条件（基准情景）'
        },
        { step: '工具调用', detail: `predict_traffic(region=${region}, horizon=${horizon})` }
      ]
      if (needExplain) {
        plan.push({ step: '工具调用', detail: `explain_attribution(region=${region})` })
      }
      plan.push({ step: '结果汇总', detail: '生成预测曲线、区域热力图与自然语言解释' })

      return {
        region,
        dataset,
        horizon,
        scenario,
        needExplain,
        tools,
        plan,
        raw: c,
        intent: `预测未来 ${horizonLabel} ${region} 区域交通流量${needExplain ? '，并解释主要影响因素' : ''}`
      }
    }
  }
}