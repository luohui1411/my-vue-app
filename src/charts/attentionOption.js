/**
 * 空间依赖强度（注意力矩阵）配置
 * @param {import('../types/models').ExplanationViewModel} vm
 */
import { GRID, HEAT_RANGE } from '../config/theme'
import { extent } from '../utils/stats'

export function attentionOption(vm) {
  // 色阶上限从数据里算，避免后端返回未归一化权重时色带全部失真
  const [, maxWeight] = extent(vm.attention, (item) => item[2])
  const max = maxWeight > 0 ? maxWeight : 1

  return {
    tooltip: {
      position: 'top',
      formatter: (p) =>
        `${vm.regionNames[p.value[1]]} → ${vm.regionNames[p.value[0]]}<br/>注意力权重：${p.value[2]}`
    },
    grid: GRID.matrix,
    xAxis: { type: 'category', data: vm.regionNames, splitArea: { show: true } },
    yAxis: { type: 'category', data: vm.regionNames, splitArea: { show: true } },
    visualMap: {
      min: 0,
      max,
      calculable: true,
      orient: 'vertical',
      right: 6,
      top: 'middle',
      text: ['强', '弱'],
      inRange: { color: HEAT_RANGE.attention }
    },
    series: [
      {
        name: '空间注意力',
        type: 'heatmap',
        data: vm.attention,
        progressive: 2000
      }
    ]
  }
}