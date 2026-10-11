<template>
  <ChartCard
    title="④ 影响因子重要性"
    hint="时间 / 空间 / 天气 / 历史趋势 等因子的归因权重"
  >
    <EChart :option="option" height="340px" />
  </ChartCard>
</template>

<script setup>
import { computed } from 'vue'
import ChartCard from '@/components/ChartCard.vue'
import EChart from '@/components/EChart.vue'
import { factorOption } from '@/charts/factorOption'

const props = defineProps({
  /** @type {import('@/types/models').FactorItem[]} */
  factors: { type: Array, default: () => [] }
})

const option = computed(() => factorOption(props.factors))
</script>