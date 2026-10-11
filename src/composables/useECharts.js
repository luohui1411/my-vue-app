import { onBeforeUnmount, onMounted, watch, nextTick } from 'vue'

// ── ECharts 按需引入 ─────────────────────────────────────────
// 不要写 import * as echarts from 'echarts'，那会把所有图表类型
// 都打进包里；这里只注册我们真正用到的图表和组件。
import * as echarts from 'echarts/core'
import { LineChart, BarChart, HeatmapChart, CustomChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  MarkLineComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  // 图表类型
  LineChart, // 流量预测折线图
  BarChart, // 因子重要性条形图
  HeatmapChart, // 区域热力图 / 空间注意力矩阵
  CustomChart, // 置信区间色带（custom series）
  // 组件
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  MarkLineComponent, // "预测起点"竖线
  // 渲染器
  CanvasRenderer
])
// ────────────────────────────────────────────────────────────

/**
 * 通用 ECharts 封装：
 * - 自动 init / dispose
 * - 监听 option 变化自动刷新（浅监听即可）
 * - 容器尺寸变化自动 resize，并用 requestAnimationFrame 合帧
 */
export function useECharts(elRef, optionRef) {
  let chart = null
  let ro = null
  let rafId = 0
  let onWinResize = null

  const render = () => {
    if (!elRef.value) return
    if (!chart) chart = echarts.init(elRef.value)
    if (optionRef.value) chart.setOption(optionRef.value, true)
  }

  // 用 rAF 合帧，避免拖拽窗口时每个像素都触发一次 resize
  const resize = () => {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      rafId = 0
      if (chart) chart.resize()
    })
  }

  onMounted(async () => {
    await nextTick()
    render()

    if (window.ResizeObserver && elRef.value) {
      ro = new ResizeObserver(resize)
      ro.observe(elRef.value)
    } else {
      onWinResize = resize
      window.addEventListener('resize', onWinResize)
    }
  })

  // option 每次都是 computed 新建的对象，引用必然变化，浅监听足够。
  // 去掉 deep:true 可避免递归遍历整个 option（热力图数据量大时开销明显）。
  watch(optionRef, () => render(), { flush: 'post' })

  onBeforeUnmount(() => {
    if (rafId) cancelAnimationFrame(rafId)
    if (ro) ro.disconnect()
    if (onWinResize) window.removeEventListener('resize', onWinResize)
    if (chart) {
      chart.dispose()
      chart = null
    }
  })

  return { getChart: () => chart }
}