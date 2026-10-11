/**
 * 区域热力图配置（区域 × 预测时段）
 * @param {import('../types/models').PredictionViewModel} vm
 */
import { GRID, HEAT_RANGE } from '../config/theme'
import { extent } from '../utils/stats'

export function regionHeatmapOption(vm) {
  // 用 extent 代替 Math.min(...values)：数据量大时不会爆栈
  const [min, max] = extent(vm.heatData, (item) => item[2])

  return {
    tooltip: {
      position: 'top',
      formatter: (p) =>
        `${vm.regionNames[p.value[1]]} · ${vm.heatTimes[p.value[0]]}<br/>预测流量：${p.value[2]} 辆/5min`
    },
    grid: GRID.withVisualMap,
    xAxis: {
      type: 'category',
      data: vm.heatTimes,
      splitArea: { show: true },
      axisLabel: { interval: 2 }
    },
    yAxis: {
      type: 'category',
      data: vm.regionNames,
      splitArea: { show: true }
    },
    visualMap: {
      min,
      max,
      calculable: true,
      orient: 'vertical',
      right: 6,
      top: 'middle',
      text: ['高', '低'],
      inRange: { color: HEAT_RANGE.flow }
    },
    series: [
      {
        name: '区域流量热力图',
        type: 'heatmap',
        data: vm.heatData,
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.35)' } },
        progressive: 2000
      }
    ]
  }
}