/**
 * 全局视觉配置（单一事实来源）
 *
 * 规则：所有图表配色、网格间距都从这里取，
 * 不要在组件里写死颜色，否则将来换主题要改一堆文件。
 */

export const COLOR = {
  primary: '#409EFF',
  success: '#67C23A',
  warning: '#E6A23C',
  danger: '#F56C6C',
  info: '#909399',
  purple: '#9B59B6',
  text: '#303133',
  textSecondary: '#606266',
  textMuted: '#909399',
  axis: '#E4E7ED',
  split: '#EBEEF5'
}

/** 折线图专用：历史观测 / 预测 / 置信区间 / 预测起点 */
export const SERIES_COLOR = {
  actual: COLOR.primary,
  actualArea: 'rgba(64,158,255,0.10)',
  predict: COLOR.danger,
  band: 'rgba(64,158,255,0.16)',
  boundary: COLOR.warning
}

/** 对比基线（ARIMA / 历史均值等）的配色，刻意压低饱和度避免喧宾夺主 */
export const BASELINE_COLORS = ['#909399', '#B37FEB', '#36CFC9', '#FFA940']

/** 多系列通用配色（因子重要性等） */
export const SERIES_PALETTE = [
  COLOR.primary,
  COLOR.success,
  COLOR.warning,
  COLOR.danger,
  COLOR.info,
  COLOR.purple
]

/** 热力图色带 */
export const HEAT_RANGE = {
  flow: ['#e0f3ff', '#5ab1ef', '#ffd664', '#ff6f6f'],
  attention: ['#f5f7fa', '#a0cfff', '#409eff', '#1d63d6']
}

/** 图表网格边距（按图表类型区分） */
export const GRID = {
  standard: { left: 58, right: 26, top: 48, bottom: 42 },
  withVisualMap: { left: 70, right: 84, top: 18, bottom: 64 },
  matrix: { left: 62, right: 84, top: 18, bottom: 56 },
  horizontalBar: { left: 160, right: 64, top: 16, bottom: 28 }
}

/** 数值轴通用样式（虚线网格 + 淡色轴线） */
export function valueAxisStyle(extra = {}) {
  return {
    type: 'value',
    splitLine: { lineStyle: { type: 'dashed', color: COLOR.split } },
    ...extra
  }
}