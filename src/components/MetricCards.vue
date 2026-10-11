<template>
  <el-row :gutter="16" class="metric-row">
    <el-col v-for="item in items" :key="item.label" :xs="12" :sm="6">
      <el-card shadow="never" class="metric-card">
        <div class="metric-label">{{ item.label }}</div>
        <div class="metric-value" :style="{ color: item.color }">
          {{ item.value }}<span class="unit">{{ item.unit }}</span>
        </div>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup>
import { computed } from 'vue'
import { COLOR } from '@/config/theme'

const props = defineProps({
  /** @type {import('@/types/models').MetricSet} */
  metrics: { type: Object, default: () => ({}) }
})

const items = computed(() => [
  { label: 'MAE（平均绝对误差）', value: props.metrics?.MAE ?? '--', unit: ' 辆', color: COLOR.primary },
  { label: 'RMSE（均方根误差）', value: props.metrics?.RMSE ?? '--', unit: ' 辆', color: COLOR.success },
  { label: 'MAPE（平均绝对百分比误差）', value: props.metrics?.MAPE ?? '--', unit: ' %', color: COLOR.warning },
  { label: 'R²（拟合优度）', value: props.metrics?.R2 ?? '--', unit: '', color: COLOR.danger }
])
</script>

<style scoped>
.metric-row {
  margin-bottom: 16px;
}
.metric-card {
  border-radius: 10px;
}
.metric-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}
.metric-value {
  font-size: 24px;
  font-weight: 700;
}
.metric-value .unit {
  font-size: 13px;
  font-weight: 400;
  color: #909399;
  margin-left: 2px;
}
</style>