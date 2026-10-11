/**
 * 数据源出口。
 *
 * 组件 / Store 只依赖这里暴露的 api 对象，
 * 切换 Mock / 真实后端由环境变量控制，上层代码零改动。
 *
 * 运行时可用地址栏参数临时覆盖（不用重新构建）：
 *   ?mock=1  强制 Mock
 *   ?mock=0  强制真实接口
 */
import { createMockProvider } from './mockProvider'
import { createHttpProvider } from './httpProvider'

const envMock = String(import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false'

/** 地址栏参数优先于环境变量；拿不到 window 的环境（测试 / SSR）自动忽略 */
function resolveMockFlag() {
  try {
    const flag = new URLSearchParams(window.location.search).get('mock')
    if (flag === '1' || flag === 'true') return true
    if (flag === '0' || flag === 'false') return false
  } catch {
    // 忽略：按环境变量走
  }
  return envMock
}

const useMock = resolveMockFlag()

/** 当前数据源模式：'mock' | 'http' */
export const MODE = useMock ? 'mock' : 'http'

export const api = useMock ? createMockProvider() : createHttpProvider()

export { toPredictionViewModel, toExplanationViewModel } from './adapters'