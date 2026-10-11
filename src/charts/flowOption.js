/**
 * 交通流量预测折线图配置
 * 纯函数：输入视图模型 -> 输出 ECharts option，方便单测与复用。
 *
 * 图层顺序（从下到上）：置信区间色带 → 对比基线 → 历史/预测曲线
 * @param {import('../types/models').PredictionViewModel} vm
 */
import { BASELINE_COLORS, GRID, SERIES_COLOR, valueAxisStyle } from '../config/theme'

export function flowOption(vm) {
  const band = []
  for (let i = 0; i < vm.times.length; i++) {
    if (vm.lower[i] != null && vm.upper[i] != null) band.push([i, vm.lower[i], vm.upper[i]])
  }

  const baselines = Array.isArray(vm.baselines) ? vm.baselines : []
  const baselineSeries = baselines.map((b, i) => ({
    name: b.name,
    type: 'line',
    smooth: true,
    showSymbol: false,
    connectNulls: true,
    z: 2,
    data: b.values,
    lineStyle: {
      width: 1.6,
      type: 'dotted',
      color: BASELINE_COLORS[i % BASELINE_COLORS.length]
    },
    itemStyle: { color: BASELINE_COLORS[i % BASELINE_COLORS.length] }
  }))

  const legendNames = ['历史观测流量', 'LLM 预测流量', ...baselines.map((b) => b.name)]

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (ps) => {
        const idx = ps[0]?.dataIndex ?? 0
        let html = `${vm.times[idx]}<br/>`
        ps.forEach((p) => {
          if (p.seriesName === '__band__') return
          if (p.value == null) return
          html += `${p.marker}${p.seriesName}：${p.value} 辆/5min<br/>`
        })
        if (vm.lower[idx] != null && vm.upper[idx] != null) {
          html += `<span style="color:#909399">95% 区间：[${vm.lower[idx]}, ${vm.upper[idx]}]</span>`
        }
        return html
      }
    },
    legend: { top: 0, data: legendNames },
    grid: GRID.standard,
    xAxis: {
      type: 'category',
      data: vm.times,
      boundaryGap: false,
      axisLabel: { interval: 4 }
    },
    yAxis: valueAxisStyle({ name: '流量（辆/5min）' }),
    series: [
      // 95% 置信区间：custom series 画多边形色带
      {
        name: '__band__',
        type: 'custom',
        silent: true,
        z: 1,
        data: band,
        encode: { x: 0, y: [1, 2] },
        renderItem: (params, api) => {
          if (params.dataIndex !== 0 || band.length < 2) return null
          const upperPts = band.map((p) => api.coord([p[0], p[2]]))
          const lowerPts = band.map((p) => api.coord([p[0], p[1]])).reverse()
          return {
            type: 'polygon',
            shape: { points: [...upperPts, ...lowerPts] },
            style: { fill: SERIES_COLOR.band, stroke: 'none' }
          }
        }
      },
      ...baselineSeries,
      {
        name: '历史观测流量',
        type: 'line',
        smooth: true,
        showSymbol: false,
        z: 3,
        data: vm.actual,
        lineStyle: { width: 3, color: SERIES_COLOR.actual },
        itemStyle: { color: SERIES_COLOR.actual },
        areaStyle: { color: SERIES_COLOR.actualArea },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', color: SERIES_COLOR.boundary },
          label: { formatter: '预测起点', position: 'insideEndTop', color: SERIES_COLOR.boundary },
          data: [{ xAxis: vm.boundaryIndex }]
        }
      },
      {
        name: 'LLM 预测流量',
        type: 'line',
        smooth: true,
        showSymbol: false,
        connectNulls: true,
        z: 4,
        data: vm.predict,
        lineStyle: { width: 3, color: SERIES_COLOR.predict, type: 'dashed' },
        itemStyle: { color: SERIES_COLOR.predict }
      }
    ]
  }
}