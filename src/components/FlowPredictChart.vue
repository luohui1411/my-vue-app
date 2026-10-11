<template>
  <ChartCard
    title="① 交通流量预测结果"
    hint="实线=历史观测 · 虚线=LLM 预测 · 蓝色带=95% 置信区间"
  >
    <template #tags>
      <el-tag size="small" type="success">{{ data.dataset }}</el-tag>
      <el-tag size="small">{{ data.region }}</el-tag>
    </template>
    <EChart :option="option" height="380px" />
  </ChartCard>
</template>

<script setup>
import { computed } from 'vue'
import ChartCard from '@/components/ChartCard.vue'
import EChart from '@/components/EChart.vue'
import { flowOption } from '@/charts/flowOption'

const props = defineProps({
  /** @type {import('@/types/models').PredictionViewModel} */
  data: { type: Object, required: true }
})

const option = computed(() => flowOption(props.data))
</script>