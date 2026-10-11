/**
 * 影响因子重要性（横向条形图）配置
 * @param {import('../types/models').FactorItem[]} factors
 */
import { GRID, SERIES_PALETTE } from '../config/theme'

export function factorOption(factors = []) {
  // 横向条形图从下往上绘制，所以反转
  const list = [...factors].reverse()
  const maxWeight = list.reduce((m, f) => Math.max(m, f.weight || 0), 0)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (ps) => {
        const p = ps[0]
        return `${p.name}<br/>重要性权重：${(p.value * 100).toFixed(1)}%`
      }
    },
    grid: GRID.horizontalBar,
    xAxis: {
      type: 'value',
      name: '权重',
      // 轴上限按数据自适应，避免柱子普遍偏短或溢出
      max: maxWeight > 0 ? Math.min(1, +(maxWeight * 1.25).toFixed(2)) : 1,
      splitLine: { lineStyle: { type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: list.map((f) => f.name),
      axisLabel: { fontSize: 12 }
    },
    series: [
      {
        type: 'bar',
        barWidth: 14,
        data: list.map((f, i) => ({
          value: f.weight,
          itemStyle: {
            color: SERIES_PALETTE[i % SERIES_PALETTE.length],
            borderRadius: [0, 7, 7, 0]
          }
        })),
        label: {
          show: true,
          position: 'right',
          formatter: (p) => `${(p.value * 100).toFixed(1)}%`
        }
      }
    ]
  }
}