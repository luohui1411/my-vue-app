<template>
  <div ref="chartRef" class="chart" :style="{ height }"></div>
</template>

<script setup>
/**
 * 通用 ECharts 渲染器。
 * 传入 option 即可，图表的 init / resize / dispose 全部由 useECharts 托管。
 */
import { ref, toRef } from 'vue'
import { useECharts } from '@/composables/useECharts'

const props = defineProps({
  /** ECharts option 对象 */
  option: { type: Object, default: null },
  /** 容器高度，默认 340px */
  height: { type: String, default: '340px' }
})

const chartRef = ref(null)

useECharts(chartRef, toRef(props, 'option'))
</script>