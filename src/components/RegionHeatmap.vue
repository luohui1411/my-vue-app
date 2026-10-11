<template>
  <ChartCard
    title="② 区域热力图（预测时段）"
    hint="颜色越深代表该区域该时刻预测流量越大"
  >
    <EChart :option="option" height="340px" />
  </ChartCard>
</template>

<script setup>
import { computed } from 'vue'
import ChartCard from '@/components/ChartCard.vue'
import EChart from '@/components/EChart.vue'
import { regionHeatmapOption } from '@/charts/regionHeatmapOption'

const props = defineProps({
  /** @type {import('@/types/models').PredictionViewModel} */
  data: { type: Object, required: true }
})

const option = computed(() => regionHeatmapOption(props.data))
</script>