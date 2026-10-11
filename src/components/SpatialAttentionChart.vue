<template>
  <ChartCard
    title="③ 空间依赖强度（注意力权重）"
    hint="基于 GPT-2 中间层注意力，反映相邻区域车流传导强度"
  >
    <EChart :option="option" height="340px" />
  </ChartCard>
</template>

<script setup>
import { computed } from 'vue'
import ChartCard from '@/components/ChartCard.vue'
import EChart from '@/components/EChart.vue'
import { attentionOption } from '@/charts/attentionOption'

const props = defineProps({
  /** @type {import('@/types/models').ExplanationViewModel} */
  data: { type: Object, required: true }
})

const option = computed(() => attentionOption(props.data))
</script>