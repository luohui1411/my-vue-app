// 真实后端数据源：后端就绪后把 VITE_USE_MOCK 设为 false 即可启用
import axios from 'axios'

/**
 * 从错误响应里提取可读信息。
 *
 * 契约推荐后端返回 { "message": "..." }；
 * 这里同时兼容 FastAPI 默认的 { "detail": "..." }（含校验错误的数组形式）
 * 以及 { "error": "..." }，避免所有错误都退化成"网络请求失败"。
 */
function extractErrorMessage(err) {
  const data = err?.response?.data

  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    if (typeof data.message === 'string' && data.message) return data.message
    if (typeof data.detail === 'string' && data.detail) return data.detail
    if (Array.isArray(data.detail) && data.detail.length) {
      const first = data.detail[0]
      if (first && typeof first.msg === 'string') return first.msg
    }
    if (typeof data.error === 'string' && data.error) return data.error
  }

  if (err?.code === 'ECONNABORTED') return '请求超时，请稍后重试'
  if (err?.response?.status) return `请求失败（HTTP ${err.response.status}）`
  return err?.message || '网络请求失败'
}

export function createHttpProvider() {
  const http = axios.create({
    baseURL: import.meta.env.VITE_API_BASE || '',
    timeout: 20000
  })

  // 统一解包 data 字段，并把错误转成可读信息
  http.interceptors.response.use(
    (res) => res.data,
    (err) => Promise.reject(new Error(extractErrorMessage(err)))
  )

  return {
    name: 'http',
    predict: (params) => http.post('/api/predict', params),
    explain: (params) => http.post('/api/explain', params),
    agent: (command) => http.post('/api/agent', { command })
  }
}